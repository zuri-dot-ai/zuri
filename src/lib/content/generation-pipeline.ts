import { createServiceClient } from "@/lib/supabase/service";
import { generateBlogPost } from "./blog-generator";
import { generateCaption } from "./caption-generator";
import { getAspectRatio } from "./image-dimensions";
import {
  generateCarouselSlidePrompts,
  generateImagePrompt,
} from "./image-prompt-generator";
import { generateImageWithSafetyRetry } from "./imagen";
import { uploadImageToStorage } from "./image-storage";
import { generateNewsletter } from "./newsletter-generator";
import type {
  BlogContent,
  GenerationInput,
  GenerationOutput,
  NewsletterContent,
  VideoScript,
} from "./types";
import { generateVideoScript } from "./video-script-generator";

const IMAGE_FORMATS = new Set(["static_image", "carousel", "story"]);
const VIDEO_FORMATS = new Set(["reel", "short_video", "video"]);
const TEXT_ONLY_FORMATS = new Set(["text_post", "article", "thread", "poll"]);

export async function runGenerationPipeline(
  input: GenerationInput
): Promise<GenerationOutput> {
  const supabase = createServiceClient();
  const warnings: string[] = [];
  let imageUrl: string | undefined;
  let imagePromptUsed: string | undefined;
  let carouselImageUrls: string[] = [];
  let caption: string | undefined;
  let hashtags: string[] = [];
  let blogContent: BlogContent | undefined;
  let newsletterContent: NewsletterContent | undefined;
  let videoScript: VideoScript | undefined;

  const isImageFormat = IMAGE_FORMATS.has(input.formatType);
  const isVideoFormat = VIDEO_FORMATS.has(input.formatType);
  const isBlogFormat = input.formatType === "blog_post";
  const isNewsletterFormat = input.formatType === "newsletter";

  if (isImageFormat) {
    try {
      if (input.formatType === "carousel") {
        const slides = await generateCarouselSlidePrompts(input, 4);
        const results = await Promise.allSettled(
          slides.map((slidePrompt) =>
            generateImageWithSafetyRetry(slidePrompt, "1:1")
          )
        );
        const successful = results
          .filter(
            (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof generateImageWithSafetyRetry>>> =>
              r.status === "fulfilled" && !!r.value.base64
          )
          .map((r) => r.value);

        if (successful.length < 2) {
          warnings.push(
            "Could not generate enough carousel images. Please try again."
          );
        } else {
          carouselImageUrls = await Promise.all(
            successful.map((r) =>
              uploadImageToStorage(
                supabase,
                input.userId,
                r.base64!,
                "carousel"
              )
            )
          );
          imageUrl = carouselImageUrls[0];
          imagePromptUsed = slides[0];
          if (successful.some((r) => r.usedFallback && r.warning)) {
            warnings.push(
              "We adjusted some carousel images to meet content guidelines."
            );
          }
        }
      } else {
        imagePromptUsed = await generateImagePrompt(input);
        const aspect = getAspectRatio(input.platform, input.formatType);
        const result = await generateImageWithSafetyRetry(
          imagePromptUsed,
          aspect
        );
        if (result.warning) warnings.push(result.warning);
        if (result.base64) {
          imageUrl = await uploadImageToStorage(
            supabase,
            input.userId,
            result.base64,
            input.formatType
          );
        }
      }
    } catch (err) {
      console.error("Image generation failed:", err);
      warnings.push(
        "Image generation failed. You can upload or search for an image manually."
      );
    }
  }

  if (isVideoFormat) {
    try {
      videoScript = await generateVideoScript(input);
      warnings.push(
        "Video generation is coming soon. Your script is ready for when Higgsfield launches."
      );
      if (videoScript.caption_for_post) {
        caption = videoScript.caption_for_post;
        hashtags = videoScript.hashtags ?? [];
      }
      if (videoScript.thumbnail_url && !imageUrl) {
        imageUrl = videoScript.thumbnail_url;
      }
    } catch (err) {
      console.error("Video script generation failed:", err);
      warnings.push(
        "Script partially generated. Please review and complete the missing sections."
      );
    }
  }

  if (isBlogFormat) {
    try {
      blogContent = await generateBlogPost(input);
    } catch (err) {
      console.error("Blog generation failed:", err);
      warnings.push(
        "Blog generation encountered an issue. Please try again."
      );
    }
  }

  if (isNewsletterFormat) {
    try {
      newsletterContent = await generateNewsletter(input);
    } catch (err) {
      console.error("Newsletter generation failed:", err);
      warnings.push(
        "Newsletter generation encountered an issue. Please try again."
      );
    }
  }

  if (!isBlogFormat && !isNewsletterFormat && !caption) {
    try {
      const result = await generateCaption(input, imageUrl);
      caption = result.caption;
      hashtags = result.hashtags;
    } catch (err) {
      console.error("Caption generation failed:", err);
      warnings.push(
        "Please review your caption — some sections may need editing."
      );
    }
  }

  const status = warnings.length > 0 ? "partial" : "ready";

  const { data: saved, error: saveError } = await supabase
    .from("generated_content")
    .insert({
      user_id: input.userId,
      calendar_slot_id: input.calendarSlotId ?? null,
      platform: input.platform,
      format_type: input.formatType,
      caption: caption ?? null,
      hashtags,
      image_url: imageUrl ?? null,
      image_prompt_used: imagePromptUsed ?? null,
      carousel_image_urls: carouselImageUrls,
      blog_content: blogContent ?? null,
      newsletter_content: newsletterContent ?? null,
      video_script: videoScript ?? null,
      thumbnail_url: videoScript?.thumbnail_url ?? null,
      status,
    })
    .select()
    .single();

  if (saveError) {
    console.error("Failed to save generated content:", saveError);
  }

  if (input.calendarSlotId && saved) {
    await supabase
      .from("content_calendar")
      .update({
        status: "generated",
        content_id: saved.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.calendarSlotId);
  }

  if (imageUrl || carouselImageUrls.length > 0) {
    const imageCount =
      carouselImageUrls.length > 0 ? carouselImageUrls.length : 1;
    await supabase.rpc("increment_usage", {
      p_user_id: input.userId,
      p_metric: "images_generated",
      p_amount: imageCount,
    });
  }

  if (blogContent) {
    await supabase.rpc("increment_usage", {
      p_user_id: input.userId,
      p_metric: "blog_posts_generated",
      p_amount: 1,
    });
  }

  if (newsletterContent) {
    await supabase.rpc("increment_usage", {
      p_user_id: input.userId,
      p_metric: "newsletters_generated",
      p_amount: 1,
    });
  }

  return {
    id: saved?.id ?? "",
    platform: input.platform,
    formatType: input.formatType,
    caption,
    hashtags,
    imageUrl,
    imagePromptUsed,
    carouselImageUrls:
      carouselImageUrls.length > 0 ? carouselImageUrls : undefined,
    blogContent,
    newsletterContent,
    videoScript,
    status,
    warnings,
  };
}

export { IMAGE_FORMATS, VIDEO_FORMATS, TEXT_ONLY_FORMATS };
