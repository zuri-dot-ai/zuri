import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AgencyApplicationsAdminClient } from "@/components/admin/agency-applications-client";
import type { AgencyApplication } from "@/lib/agencies/types";

export const dynamic = "force-dynamic";

export default async function AdminAgencyApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/agency-applications");
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) redirect("/dashboard");

  const service = createServiceClient();
  const { data, error } = await service
    .from("agency_applications")
    .select(
      `
      id,
      agency_name,
      contact_name,
      email,
      phone,
      whatsapp,
      website,
      logo_url,
      location_city,
      services,
      team_size,
      price_range,
      portfolio_urls,
      portfolio_image_urls,
      description,
      referral_source,
      status,
      reviewer_notes,
      reviewed_at,
      created_at
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          Agency applications
        </h1>
        <p className="mt-4 text-sm text-red-600">
          Failed to load applications: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 border-b border-border pb-6">
        <p className="eyebrow">Queue</p>
        <h1 className="font-heading text-3xl font-semibold">
          Agency applications
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review marketplace applications — reject or approve &amp; publish a
          listing.
        </p>
      </header>
      <AgencyApplicationsAdminClient
        initialApplications={(data ?? []) as AgencyApplication[]}
      />
    </div>
  );
}
