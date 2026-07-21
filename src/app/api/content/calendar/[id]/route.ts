import { NextResponse } from "next/server";
import {
  isValidPlatform,
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { PLATFORM_FORMATS } from "@/lib/content/calendar-generator";
import { sanitizeText } from "@/lib/utils/sanitize";

const VALID_STATUSES = ["draft", "approved", "generated", "posted", "skipped"];

function validateSlotPatch(body: Record<string, unknown>): string | null {
  if (body.topic !== undefined) {
    const topic = sanitizeText(body.topic);
    if (topic.length < 5 || topic.length > 200) {
      return "Topic must be 5–200 characters.";
    }
  }
  if (body.hook !== undefined) {
    const hook = sanitizeText(body.hook);
    if (hook.length > 150) return "Hook must be at most 150 characters.";
  }
  if (body.brief !== undefined) {
    const brief = sanitizeText(body.brief);
    if (brief.length > 500) return "Brief must be at most 500 characters.";
  }
  if (body.platform !== undefined && !isValidPlatform(String(body.platform))) {
    return "Platform must be one of: instagram, facebook, linkedin, x, tiktok.";
  }
  if (body.format_type !== undefined && body.platform !== undefined) {
    const formats = PLATFORM_FORMATS[String(body.platform)];
    if (
      formats &&
      !formats.some((f) => f.type === String(body.format_type))
    ) {
      return "That format is not valid for the selected platform.";
    }
  }
  if (body.scheduled_date !== undefined) {
    const d = new Date(String(body.scheduled_date));
    if (Number.isNaN(d.getTime())) return "Please choose a valid date.";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return "Please choose a future date.";
    const max = new Date();
    max.setMonth(max.getMonth() + 12);
    if (d > max) return "You can only schedule up to 12 months ahead.";
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(String(body.status))) {
    return "Invalid status.";
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateSlotPatch(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  for (const key of [
    "topic",
    "hook",
    "brief",
    "platform",
    "format_type",
    "scheduled_date",
    "scheduled_time",
    "pillar_id",
    "status",
  ]) {
    if (body[key] !== undefined) {
      if (typeof body[key] === "string" && ["topic", "hook", "brief"].includes(key)) {
        allowed[key] = sanitizeText(body[key]);
      } else {
        allowed[key] = body[key];
      }
    }
  }
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("content_calendar")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("*, content_pillars(id, name, color, icon)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  return NextResponse.json({ slot: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { id } = await params;

  const { error } = await auth.supabase
    .from("content_calendar")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
