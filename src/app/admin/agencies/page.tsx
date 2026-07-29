import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AgenciesAdminClient } from "@/components/admin/agencies-admin-client";
import type { Agency } from "@/lib/agencies/types";

export const dynamic = "force-dynamic";

export default async function AdminAgenciesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/agencies");
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) redirect("/dashboard");

  const service = createServiceClient();
  const { data, error } = await service
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-3xl font-semibold">Agencies</h1>
        <p className="mt-4 text-sm text-red-600">
          Failed to load agencies: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 border-b border-border pb-6">
        <p className="eyebrow">Directory</p>
        <h1 className="font-heading text-3xl font-semibold">Agencies</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Publish, feature, verify, and certify marketplace listings.
        </p>
      </header>
      <AgenciesAdminClient initialAgencies={(data ?? []) as Agency[]} />
    </div>
  );
}
