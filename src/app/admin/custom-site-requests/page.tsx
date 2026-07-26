import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  CustomSiteRequestsAdminClient,
  type AdminCustomSiteRequest,
} from "@/components/admin/custom-site-requests-client";

export const dynamic = "force-dynamic";

export default async function AdminCustomSiteRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/custom-site-requests");
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) redirect("/dashboard");

  const service = createServiceClient();
  const { data, error } = await service
    .from("custom_site_requests")
    .select(
      `
      id,
      user_id,
      project_type,
      description,
      features,
      custom_integrations_text,
      other_features_text,
      budget_range,
      timeline,
      reference_url,
      status,
      reviewer_notes,
      reviewed_at,
      created_at,
      profiles:user_id ( full_name, email )
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          Custom site requests
        </h1>
        <p className="mt-4 text-sm text-red-600">
          Failed to load requests: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 border-b border-border pb-6">
        <p className="eyebrow">Queue</p>
        <h1 className="font-heading text-3xl font-semibold">
          Custom site requests
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review and update status for backend/CMS build enquiries.
        </p>
      </header>
      <CustomSiteRequestsAdminClient
        initialRequests={(data ?? []) as AdminCustomSiteRequest[]}
      />
    </div>
  );
}
