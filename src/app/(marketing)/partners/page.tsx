import type { Metadata } from "next";
import Link from "next/link";
import { Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/service";
import type { AgencyRow } from "@/types/database";

export const metadata: Metadata = { title: "Agency Partners" };

export default async function AgenciesMarketingPage() {
  const supabase = createServiceClient();
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name, description, specialties, location, price_range, rating, review_count, is_verified, is_featured")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("rating", { ascending: false })
    .limit(3);

  return (
    <div className="zuri-container py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-gold">Agency Partners</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">
          Your strategy. Their execution.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Vetted Nigerian agencies, matched to your brief by Gemini. Zuri writes the brief
          for you automatically from your brand profile.
        </p>
      </div>

      {/* How matching works */}
      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center font-heading text-2xl font-semibold">How matching works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "You click Get Matched", d: "On any page inside your Zuri dashboard." },
            { n: "2", t: "Gemini writes your brief", d: "Automatically, from your brand profile. Review and submit in seconds." },
            { n: "3", t: "Agency responds in 48h", d: "Your top-matched agency receives your brief and responds within 48 hours." },
          ].map(({ n, t, d }) => (
            <div key={n} className="zuri-card text-center">
              <span className="font-heading text-4xl font-semibold text-gold">{n}</span>
              <h3 className="mt-3 font-medium">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured agencies */}
      {agencies && agencies.length > 0 && (
        <div className="mt-20">
          <h2 className="text-center font-heading text-2xl font-semibold">Featured Partners</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(agencies as AgencyRow[]).map((a) => (
              <div key={a.id} className="zuri-card">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold">{a.name}</h3>
                  {a.is_verified && <CheckCircle2 className="size-4 text-gold" />}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5 fill-gold text-gold" />
                  {a.rating} · {a.location}
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-4 font-mono text-sm font-semibold text-gold">{a.price_range}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-20 text-center">
        <Button asChild size="lg">
          <Link href="/signup">Sign up and get matched</Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Agency matching is included in the Growth plan.
        </p>
      </div>
    </div>
  );
}