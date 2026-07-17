import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    id?: string;
    needs_revision?: boolean;
    revision_note?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, needs_revision, revision_note } = body;
  if (!id || typeof needs_revision !== "boolean") {
    return NextResponse.json(
      { error: "id and needs_revision are required" },
      { status: 400 }
    );
  }

  // Service role write after admin gate — works even if templates RLS isn't applied yet
  const service = createServiceClient();
  const { data, error } = await service
    .from("templates")
    .update({
      needs_revision,
      revision_note: needs_revision
        ? (revision_note?.trim() || null)
        : null,
    })
    .eq("id", id)
    .select("id, needs_revision, revision_note")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template: data });
}
