import { NextResponse } from "next/server";

/** Legacy path — prefer /api/auth/callback */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const qs = new URLSearchParams();
  if (code) qs.set("code", code);
  qs.set("next", next);
  return NextResponse.redirect(`${origin}/api/auth/callback?${qs.toString()}`);
}
