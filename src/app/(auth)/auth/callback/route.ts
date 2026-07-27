import { NextResponse } from "next/server";
import { getAppOrigin, safeNextPath } from "@/lib/auth/redirect";

/** Legacy path — prefer /api/auth/callback */
export async function GET(request: Request) {
  const appOrigin = getAppOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const qs = new URLSearchParams();
  if (code) qs.set("code", code);
  qs.set("next", next);
  return NextResponse.redirect(
    `${appOrigin}/api/auth/callback?${qs.toString()}`
  );
}
