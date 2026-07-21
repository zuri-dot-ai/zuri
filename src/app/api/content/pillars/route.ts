import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { isGrowthPlus } from "@/lib/payments/get-plan";
import { sanitizeText } from "@/lib/utils/sanitize";

const PILLAR_NAME_RE = /^[a-zA-Z0-9 &]+$/;

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

  // Custom pillars are Growth+; Pro gets defaults only
  if (!isGrowthPlus(auth.planId)) {
    return NextResponse.json(
      {
        error:
          "Custom content pillars are available from the Growth plan. Upgrade to continue.",
        upgradeRequired: "growth",
      },
      { status: 403 }
    );
  }

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

  const { data, error } = await auth.supabase
    .from("content_pillars")
    .insert({
      user_id: auth.user.id,
      name,
      description: description || null,
      icon: sanitizeText(body.icon).slice(0, 40) || "Star",
      color: sanitizeText(body.color).slice(0, 20) || "#C9A84C",
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
