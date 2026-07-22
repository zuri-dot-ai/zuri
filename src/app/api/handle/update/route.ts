// docs/09_DEPLOYMENT.md §4.3
// PATCH /api/handle/update — changes the user's handle while not locked.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateHandle,
  generateHandleSuggestions,
} from "@/lib/handle/rules";

function sanitizeHandle(raw: string): string {
  return raw.toLowerCase().trim();
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { handle?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawHandle = body.handle;
  if (typeof rawHandle !== "string") {
    return NextResponse.json({ error: "Handle is required." }, { status: 400 });
  }

  // Check if handle is locked
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, handle_locked")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.handle_locked) {
    return NextResponse.json(
      {
        error:
          "Your handle is locked because your website is published. To change your handle, unpublish your website first.",
      },
      { status: 403 }
    );
  }

  const handle = sanitizeHandle(rawHandle);
  const validation = validateHandle(handle);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check availability
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "This handle is taken.",
        suggestions: generateHandleSuggestions(handle),
      },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ handle })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, handle });
}
