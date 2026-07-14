import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RESERVED_HANDLES,
  generateHandleSuggestions,
  validateHandle,
} from "@/lib/handle/rules";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle")?.toLowerCase().trim();

  if (!handle) {
    return NextResponse.json({ error: "Handle required" }, { status: 400 });
  }

  const validation = validateHandle(handle);
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      reason: RESERVED_HANDLES.has(handle) ? "reserved" : "invalid_format",
      suggestions: RESERVED_HANDLES.has(handle)
        ? generateHandleSuggestions(handle)
        : undefined,
    });
  }

  if (RESERVED_HANDLES.has(handle)) {
    return NextResponse.json({
      available: false,
      reason: "reserved",
      suggestions: generateHandleSuggestions(handle),
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();

  // PGRST116 / null data = available; real errors should surface as retryable
  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Couldn't check availability. Tap to retry." },
      { status: 500 }
    );
  }

  if (data) {
    return NextResponse.json({
      available: false,
      reason: "taken",
      suggestions: generateHandleSuggestions(handle),
    });
  }

  return NextResponse.json({ available: true });
}
