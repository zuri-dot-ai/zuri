import { NextResponse } from "next/server";
import {
  storeSearchConsoleConnection,
  syncSearchConsoleData,
} from "@/lib/analytics/search-console-sync";

export async function GET(req: Request) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${appUrl}/analytics?gsc_connect=failed`
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/analytics/search-console/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.refresh_token) {
      return NextResponse.redirect(
        `${appUrl}/analytics?gsc_connect=failed`
      );
    }

    await storeSearchConsoleConnection(state, tokenData.refresh_token);

    syncSearchConsoleData(state).catch((err) =>
      console.error("Initial GSC sync failed:", err)
    );

    return NextResponse.redirect(
      `${appUrl}/analytics?gsc_connect=success`
    );
  } catch (err) {
    console.error("GSC OAuth callback failed:", err);
    return NextResponse.redirect(
      `${appUrl}/analytics?gsc_connect=failed`
    );
  }
}
