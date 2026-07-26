import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertCustomSiteSession } from "@/lib/custom-site/anonymous-session";

/**
 * POST /api/custom-site/convert
 * Auth required. Attaches the anonymous funnel session to the newly signed-up user
 * so answers survive across the signup gate until submit.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";
  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  try {
    await convertCustomSiteSession(sessionToken, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[custom-site/convert] failed:", err);
    return NextResponse.json(
      { error: "Could not save your answers. Please try again." },
      { status: 500 }
    );
  }
}
