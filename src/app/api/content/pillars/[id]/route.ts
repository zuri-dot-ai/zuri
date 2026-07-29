import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { sanitizeText } from "@/lib/utils/sanitize";

const PILLAR_NAME_RE = /^[a-zA-Z0-9 &]+$/;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { id } = await params;
  let body: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    is_active?: boolean;
    sort_order?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    const name = sanitizeText(body.name);
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: "Pillar name must be 2–50 characters." },
        { status: 400 }
      );
    }
    if (!PILLAR_NAME_RE.test(name) || /^\d+$/.test(name)) {
      return NextResponse.json(
        {
          error:
            "Pillar name may only contain letters, numbers, spaces, and ampersands.",
        },
        { status: 400 }
      );
    }
    patch.name = name;
  }
  if (body.description !== undefined) {
    patch.description =
      body.description == null
        ? null
        : sanitizeText(body.description).slice(0, 120) || null;
  }
  if (body.icon !== undefined) {
    patch.icon =
      body.icon == null ? null : sanitizeText(body.icon).slice(0, 40) || null;
  }
  if (body.color !== undefined) {
    patch.color =
      body.color == null ? null : sanitizeText(body.color).slice(0, 20) || null;
  }
  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = Math.max(0, Math.floor(body.sort_order));
  }

  const { data, error } = await auth.supabase
    .from("content_pillars")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update pillar" }, { status: 500 });
  }

  return NextResponse.json({ pillar: data });
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

  const { count } = await auth.supabase
    .from("content_pillars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id);

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Keep at least one content pillar." },
      { status: 403 }
    );
  }

  // Unlink calendar slots before delete
  await auth.supabase
    .from("content_calendar")
    .update({ pillar_id: null })
    .eq("user_id", auth.user.id)
    .eq("pillar_id", id);

  const { error } = await auth.supabase
    .from("content_pillars")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete pillar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
