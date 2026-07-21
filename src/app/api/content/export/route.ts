import { NextResponse } from "next/server";
import {
  blogContentToHTML,
  blogContentToMarkdown,
} from "@/lib/content/blog-generator";
import { newsletterContentToHTML } from "@/lib/content/newsletter-generator";
import { requireContentUser, mapBrandForCalendar } from "@/lib/content/api-helpers";
import type { BlogContent, NewsletterContent } from "@/lib/content/types";

export async function GET(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { searchParams } = new URL(req.url);
  const contentId = searchParams.get("id");
  const format = searchParams.get("format");

  if (!contentId) {
    return NextResponse.json(
      { error: "id query param is required" },
      { status: 400 }
    );
  }
  if (!format) {
    return NextResponse.json(
      { error: "format query param is required" },
      { status: 400 }
    );
  }

  const { data: content } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  switch (format) {
    case "caption":
      return new Response(content.caption ?? "", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "hashtags":
      return new Response((content.hashtags ?? []).join(" "), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "blog_markdown": {
      if (!content.blog_content) {
        return NextResponse.json(
          { error: "No blog content available" },
          { status: 400 }
        );
      }
      const markdown = blogContentToMarkdown(
        content.blog_content as BlogContent
      );
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="blog-post-${contentId}.md"`,
        },
      });
    }

    case "blog_html": {
      if (!content.blog_content) {
        return NextResponse.json(
          { error: "No blog content available" },
          { status: 400 }
        );
      }
      const html = blogContentToHTML(content.blog_content as BlogContent);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="blog-post-${contentId}.html"`,
        },
      });
    }

    case "newsletter_html": {
      if (!content.newsletter_content) {
        return NextResponse.json(
          { error: "No newsletter content available" },
          { status: 400 }
        );
      }
      const { data: brandRow } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const brand = brandRow
        ? mapBrandForCalendar(brandRow as Record<string, unknown>)
        : { business_name: "Business", tagline: "" };
      const newsletterHtml = newsletterContentToHTML(
        content.newsletter_content as NewsletterContent,
        brand
      );
      return new Response(newsletterHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="newsletter-${contentId}.html"`,
        },
      });
    }

    case "image_download": {
      if (!content.image_url) {
        return NextResponse.json(
          { error: "No image available" },
          { status: 400 }
        );
      }
      return NextResponse.redirect(content.image_url);
    }

    default:
      return NextResponse.json(
        { error: "Invalid export format" },
        { status: 400 }
      );
  }
}
