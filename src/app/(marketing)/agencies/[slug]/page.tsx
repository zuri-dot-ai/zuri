import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, Star, BadgeCheck, ExternalLink } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import {
  AGENCY_SERVICE_LABELS,
  PRICE_RANGE_LABELS,
  RESPONSE_TIME_LABELS,
  TEAM_SIZE_LABELS,
  type Agency,
  type AgencyService,
  type PortfolioItem,
} from "@/lib/agencies/types";
import { ContactAgencyModal } from "@/components/marketing/contact-agency-modal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${slug} — Agency Marketplace` };
}

export default async function AgencyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single<Agency>();

  if (!agency) notFound();

  const { data: related } = await supabase
    .from("agencies")
    .select("*")
    .eq("is_active", true)
    .neq("id", agency.id)
    .overlaps("services", agency.services)
    .limit(3);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-10">
      <Link href="/agencies" className="text-sm text-muted-foreground hover:underline">
        ← Back to directory
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {agency.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-gold/20 font-heading text-2xl text-gold">
              {agency.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold">{agency.name}</h1>
              {agency.is_zuri_certified && (
                <Star
                  className="size-4 fill-gold text-gold"
                  aria-label="Zuri Certified"
                />
              )}
              {agency.is_verified && (
                <BadgeCheck className="size-4 text-blue-400" aria-label="Verified" />
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{agency.tagline}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {agency.location_city}
            </p>
          </div>
        </div>
        <ContactAgencyModal agencyId={agency.id} agencyName={agency.name} />
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          About
        </h2>
        <p className="text-sm leading-relaxed">{agency.description}</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Services
        </h2>
        <div className="flex flex-wrap gap-2">
          {agency.services.map((s: AgencyService) => (
            <span
              key={s}
              className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {AGENCY_SERVICE_LABELS[s]}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Price range</p>
          <p className="mt-1 font-medium text-gold">{PRICE_RANGE_LABELS[agency.price_range]}</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Team size</p>
          <p className="mt-1 font-medium">{TEAM_SIZE_LABELS[agency.team_size]}</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> Response time
          </p>
          <p className="mt-1 font-medium">{RESPONSE_TIME_LABELS[agency.response_time]}</p>
        </div>
      </section>

      {agency.portfolio_items?.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Portfolio
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {agency.portfolio_items.map((item: PortfolioItem, idx: number) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col rounded-md border border-border p-4 hover:border-[var(--border-hover)]"
              >
                <p className="flex items-center gap-1 text-sm font-medium">
                  {item.title} <ExternalLink className="size-3" />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {related && related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            You might also like
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(related as Agency[]).map((r) => (
              <Link
                key={r.id}
                href={`/agencies/${r.slug}`}
                className="rounded-md border border-border p-4 hover:border-[var(--border-hover)]"
              >
                <p className="text-sm font-medium">{r.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
