import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";

/** Legacy path — prefer /api/auth/callback */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const qs = new URLSearchParams();
  if (code) qs.set("code", code);
  qs.set("next", next);
  return NextResponse.redirect(`${origin}/api/auth/callback?${qs.toString()}`);
}
