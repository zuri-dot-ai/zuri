import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TemplatesAdminClient } from "@/components/admin/templates-admin-client";

export const dynamic = "force-dynamic";

export type AdminTemplateRow = {
  id: string;
  archetype: string;
  mode: string;
  lean: string;
  display_name: string;
  storage_path: string;
  needs_revision: boolean;
  revision_note: string | null;
  placeholder_fields: string[];
  image_slots: string[];
};

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin/templates");

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) redirect("/dashboard");

  const { data: templates, error } = await supabase
    .from("templates")
    .select(
      "id, archetype, mode, lean, display_name, storage_path, needs_revision, revision_note, placeholder_fields, image_slots"
    )
    .order("archetype", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="font-heading text-3xl font-semibold">Templates</h1>
        <p className="mt-4 text-sm text-red-600">
          Failed to load templates: {error.message}
        </p>
      </div>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const rows = (templates ?? []) as AdminTemplateRow[];

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-[#f2ede6]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <header className="mb-10 border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#c9a24c]">
            Internal Admin
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight">
            Website Templates
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            {rows.length} templates in library. Preview in iframe, flag for
            revision when something needs a rework.
          </p>
        </header>

        <TemplatesAdminClient
          templates={rows}
          storageBaseUrl={`${supabaseUrl}/storage/v1/object/public/website-templates`}
        />
      </div>
    </div>
  );
}
