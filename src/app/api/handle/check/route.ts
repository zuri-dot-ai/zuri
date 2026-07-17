import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  const supabase = createServiceClient();

  // Prefer SECURITY DEFINER RPC (works even without direct table GRANTs)
  const { data: available, error: rpcError } = await supabase.rpc(
    "is_handle_available",
    { p_handle: handle }
  );

  if (!rpcError && typeof available === "boolean") {
    if (!available) {
      return NextResponse.json({
        available: false,
        reason: "taken",
        suggestions: generateHandleSuggestions(handle),
      });
    }
    return NextResponse.json({ available: true });
  }

  if (rpcError) {
    console.warn(
      "[handle/check] is_handle_available RPC unavailable, falling back to table select:",
      rpcError.message
    );
  }

  // Fallback: direct select (requires GRANT SELECT ON profiles TO service_role)
  const { data: profileHit, error: profileError } = await supabase
    .from("profiles")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();

  if (profileError) {
    console.error("[handle/check] profiles lookup failed:", profileError);
    return NextResponse.json(
      {
        error: "Couldn't check availability. Tap to retry.",
        details: profileError.message,
        hint: profileError.hint,
      },
      { status: 500 }
    );
  }

  if (profileHit) {
    return NextResponse.json({
      available: false,
      reason: "taken",
      suggestions: generateHandleSuggestions(handle),
    });
  }

  const { data: websiteHit, error: websiteError } = await supabase
    .from("websites")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();

  if (websiteError) {
    console.warn("[handle/check] websites lookup skipped:", websiteError.message);
  } else if (websiteHit) {
    return NextResponse.json({
      available: false,
      reason: "taken",
      suggestions: generateHandleSuggestions(handle),
    });
  }

  return NextResponse.json({ available: true });
}
