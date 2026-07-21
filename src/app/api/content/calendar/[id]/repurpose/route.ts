import { NextResponse } from "next/server";
import {
  isValidPlatform,
  requireContentUser,
  requireGrowthPlus,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { repurposeSlot } from "@/lib/content/repurpose-engine";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const growth = requireGrowthPlus(auth.planId, "Repurposing across platforms");
  if ("error" in growth) return growth.error;

  const { id } = await params;

  let body: { platforms?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const platforms = (body.platforms ?? []).filter(isValidPlatform);
  if (platforms.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one target platform." },
      { status: 400 }
    );
  }

  const { data: source } = await auth.supabase
    .from("content_calendar")
    .select("platform")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!source) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const targets = platforms.filter((p) => p !== source.platform);
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "Choose platforms other than the source platform." },
      { status: 400 }
    );
  }

  try {
    const slots = await repurposeSlot(
      auth.supabase,
      auth.user.id,
      id,
      targets
    );
    return NextResponse.json({ slots, slots_created: slots.length });
  } catch (err) {
    console.error("[repurpose]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not repurpose to all platforms. Please try again.",
      },
      { status: 500 }
    );
  }
}
