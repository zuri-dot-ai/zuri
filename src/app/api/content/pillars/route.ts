import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { sanitizeText } from "@/lib/utils/sanitize";

const PILLAR_NAME_RE = /^[a-zA-Z0-9 &]+$/;
const PILLAR_COLORS = [
  "#E2843A",
  "#C9A84C",
  "#D94F4F",
  "#4FA8D9",
  "#4DA86E",
  "#9B59B6",
];

function validateName(name: string): string | null {
  if (name.length < 2 || name.length > 50) {
    return "Pillar name must be 2–50 characters.";
  }
  if (!PILLAR_NAME_RE.test(name) || /^\d+$/.test(name)) {
    return "Pillar name may only contain letters, numbers, spaces, and ampersands.";
  }
  return null;
}

export async function GET() {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { data, error } = await auth.supabase
    .from("content_pillars")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load pillars" }, { status: 500 });
  }

  return NextResponse.json({ pillars: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  let body: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = sanitizeText(body.name);
  const description = sanitizeText(body.description).slice(0, 120);
  const nameErr = validateName(name);
  if (nameErr) {
    return NextResponse.json({ error: nameErr }, { status: 400 });
  }

  const { count } = await auth.supabase
    .from("content_pillars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id);

  if ((count ?? 0) >= 6) {
    return NextResponse.json(
      { error: "You can have a maximum of 6 content pillars." },
      { status: 403 }
    );
  }

  const colorIndex = count ?? 0;
  const { data, error } = await auth.supabase
    .from("content_pillars")
    .insert({
      user_id: auth.user.id,
      name,
      description: description || null,
      icon: sanitizeText(body.icon).slice(0, 40) || "Star",
      color:
        sanitizeText(body.color).slice(0, 20) ||
        PILLAR_COLORS[colorIndex % PILLAR_COLORS.length],
      is_active: true,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create pillar" }, { status: 500 });
  }

  return NextResponse.json({ pillar: data }, { status: 201 });
}

/** Bulk reorder + patch active flags: { order: string[] } */
export async function PATCH(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  let body: { order?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const order = Array.isArray(body.order)
    ? body.order.filter((id): id is string => typeof id === "string")
    : [];
  if (order.length === 0) {
    return NextResponse.json({ error: "order must be a non-empty id list" }, { status: 400 });
  }

  const updates = order.map((id, index) =>
    auth.supabase
      .from("content_pillars")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", auth.user.id)
  );
  await Promise.all(updates);

  const { data } = await auth.supabase
    .from("content_pillars")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ pillars: data ?? [] });
}
