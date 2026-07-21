import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken } from "@/lib/analytics/token-encryption";
import {
  fetchMetaAccounts,
  syncMetaInsights,
} from "@/lib/analytics/meta-sync";

export async function GET(req: Request) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${appUrl}/analytics?meta_connect=failed`
    );
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: `${appUrl}/api/analytics/meta/callback`,
          code,
        })
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${appUrl}/analytics?meta_connect=failed`
      );
    }

    const longTokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          fb_exchange_token: tokenData.access_token,
        })
    );
    const longToken = await longTokenRes.json();
    if (!longToken.access_token) {
      return NextResponse.redirect(
        `${appUrl}/analytics?meta_connect=failed`
      );
    }

    const supabase = createServiceClient();
    const encryptedToken = encryptToken(longToken.access_token);
    const expiresAt = new Date(
      Date.now() + (longToken.expires_in ?? 5184000) * 1000
    );

    const { pages, instagramAccount } = await fetchMetaAccounts(
      longToken.access_token
    );

    await supabase.from("meta_connections").upsert(
      {
        user_id: state,
        access_token_encrypted: encryptedToken,
        token_expires_at: expiresAt.toISOString(),
        facebook_page_id: pages[0]?.id ?? null,
        facebook_page_name: pages[0]?.name ?? null,
        instagram_account_id: instagramAccount?.id ?? null,
        instagram_username: instagramAccount?.username ?? null,
        connected_at: new Date().toISOString(),
        status: "active",
      },
      { onConflict: "user_id" }
    );

    // Initial sync — don't block redirect
    syncMetaInsights(state).catch((err) =>
      console.error("Initial Meta sync failed:", err)
    );

    return NextResponse.redirect(
      `${appUrl}/analytics?meta_connect=success`
    );
  } catch (err) {
    console.error("Meta OAuth callback failed:", err);
    return NextResponse.redirect(
      `${appUrl}/analytics?meta_connect=failed`
    );
  }
}
