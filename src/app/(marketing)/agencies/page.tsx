import Link from "next/link";
import { MapPin, Clock, Star, BadgeCheck } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import {
  AGENCY_SERVICE_LABELS,
  PRICE_RANGE_LABELS,
  RESPONSE_TIME_LABELS,
  type Agency,
  type AgencyService,
} from "@/lib/agencies/types";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Find a professional — Agency Marketplace",
};

const PAGE_SIZE = 12;

async function loadAgencies(searchParams: Record<string, string | string[] | undefined>) {
  const services = ([] as string[]).concat(searchParams.service ?? []);
  const priceRange =
    typeof searchParams.price_range === "string" ? searchParams.price_range : null;
  const location =
    typeof searchParams.location === "string" ? searchParams.location : null;
  const search = typeof searchParams.q === "string" ? searchParams.q : null;
  const page = Math.max(1, parseInt(String(searchParams.page ?? "1"), 10) || 1);

  const supabase = createServiceClient();
  let query = supabase
    .from("agencies")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("is_zuri_certified", { ascending: false })
    .order("is_verified", { ascending: false })
    .order("inquiries_count", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (services.length > 0) query = query.overlaps("services", services);
  if (priceRange && ["budget", "mid", "premium"].includes(priceRange)) {
    query = query.eq("price_range", priceRange);
  }
  if (location && location !== "all") {
    query = query.ilike("location_city", `%${location}%`);
  }
  if (search && search.length >= 2) {
    query = query.or(
      `name.ilike.%${search}%,tagline.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const { data, count } = await query;
  return { agencies: (data ?? []) as Agency[], total: count ?? 0, page, services, priceRange, location, search };
}

export default async function AgenciesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const { agencies, total, services, priceRange, location, search } =
    await loadAgencies(resolvedParams);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold">Find a professional</h1>
        <p className="text-muted-foreground">
          Vetted Nigerian agencies ready to grow your business.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-muted-foreground">
            Search agencies
          </label>
          <input
            id="q"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search by name or service"
            className="min-w-[220px] rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="price_range" className="text-xs text-muted-foreground">
            Price range
          </label>
          <select
            id="price_range"
            name="price_range"
            defaultValue={priceRange ?? ""}
            className="rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All price ranges</option>
            {Object.entries(PRICE_RANGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-xs text-muted-foreground">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={location ?? ""}
            placeholder="Lagos, Abuja…"
            className="min-w-[160px] rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-sm bg-gold px-5 py-2 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Filter
        </button>
        {(services.length > 0 || priceRange || location || search) && (
          <Link href="/agencies" className="text-sm text-muted-foreground underline">
            Clear filters
          </Link>
        )}
      </form>

      {agencies.length === 0 ? (
        <div className="rounded-md border border-border p-10 text-center text-sm text-muted-foreground">
          No agencies match your filters. Try removing some filters or browse all agencies.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {total} agenc{total === 1 ? "y" : "ies"} listed. Are you an agency?{" "}
        <Link href="/agencies/apply" className="text-gold underline">
          Apply to be listed
        </Link>
        .
      </p>
    </div>
  );
}

function AgencyCard({ agency }: { agency: Agency }) {
  const initial = agency.name.charAt(0).toUpperCase();
  return (
    <Link
      href={`/agencies/${agency.slug}`}
      className={cn(
        "flex flex-col rounded-md border p-4 transition-colors hover:border-[var(--border-hover)]",
        agency.is_featured ? "border-gold" : "border-border"
      )}
    >
      <div className="flex items-center gap-3">
        {agency.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agency.logo_url}
            alt={agency.name}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-gold/20 font-heading text-lg text-gold">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold">{agency.name}</h3>
            {agency.is_zuri_certified && (
              <Star className="size-3.5 shrink-0 fill-gold text-gold" />
            )}
            {agency.is_verified && (
              <BadgeCheck className="size-3.5 shrink-0 text-blue-400" />
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> {agency.location_city}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{agency.tagline}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {agency.services.slice(0, 3).map((s: AgencyService) => (
          <span
            key={s}
            className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {AGENCY_SERVICE_LABELS[s]}
          </span>
        ))}
        {agency.services.length > 3 && (
          <span className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
            +{agency.services.length - 3} more
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="font-mono text-gold">{PRICE_RANGE_LABELS[agency.price_range]}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" /> {RESPONSE_TIME_LABELS[agency.response_time]}
        </span>
      </div>
    </Link>
  );
}
