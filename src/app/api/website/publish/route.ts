import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FREE_LIMITS } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { websiteId } = (await request.json()) as { websiteId: string };

  // Free tier cannot publish
  const { data: account } = await supabase
    .from("users").select("subscription_plan").eq("id", user.id).single();
  if (account?.subscription_plan === "free" && FREE_LIMITS.websitePreviewOnly) {
    return NextResponse.json(
      { error: "Upgrade to publish your website live." },
      { status: 402 }
    );
  }

  // Get the website + business name for slug
  const { data: website } = await supabase
    .from("websites")
    .select("id, published_slug, business_profile_id")
    .eq("id", websiteId).eq("user_id", user.id).single();
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let slug = website.published_slug;

  // Generate a unique slug if not already set (uses the DB function from Batch 2)
  if (!slug) {
    const { data: profile } = await supabase
      .from("business_profiles").select("business_name")
      .eq("id", website.business_profile_id).single();
    const { data: generated } = await supabase
      .rpc("generate_unique_slug", { p_name: profile?.business_name || "site" });
    slug = generated as string;
  }

  const { error } = await supabase
    .from("websites")
    .update({ published_slug: slug, is_published: true, last_edited: new Date().toISOString() })
    .eq("id", websiteId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const liveUrl = `https://${slug}.${rootDomain}`;
  return NextResponse.json({ slug, liveUrl });
}