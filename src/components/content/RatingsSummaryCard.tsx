"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";

type RatingRow = {
  rating: number;
  generated_content?: {
    platform?: string;
    calendar_slot_id?: string;
    content_calendar?: {
      pillar_id?: string | null;
      content_pillars?: { name?: string } | null;
    } | null;
  } | null;
};

export function RatingsSummaryCard() {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [topPillar, setTopPillar] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await safeFetchJSON<{ ratings: RatingRow[] }>(
          "/api/content/ratings-summary"
        );
        if (cancelled) return;
        const rows = data.ratings ?? [];
        setCount(rows.length);
        if (rows.length === 0) {
          setAvg(null);
          setTopPillar(null);
        } else {
          const sum = rows.reduce((a, r) => a + (r.rating ?? 0), 0);
          setAvg(Math.round((sum / rows.length) * 10) / 10);

          if (rows.length >= 5) {
            const byPillar = new Map<string, { sum: number; n: number }>();
            for (const r of rows) {
              const name =
                r.generated_content?.content_calendar?.content_pillars?.name;
              if (!name) continue;
              const cur = byPillar.get(name) ?? { sum: 0, n: 0 };
              cur.sum += r.rating;
              cur.n += 1;
              byPillar.set(name, cur);
            }
            let best: string | null = null;
            let bestAvg = -1;
            for (const [name, { sum, n }] of byPillar) {
              const a = sum / n;
              if (a > bestAvg) {
                bestAvg = a;
                best = name;
              }
            }
            setTopPillar(best);
          } else {
            setTopPillar(null);
          }
        }
      } catch {
        /* silent — card is optional */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;

  return (
    <div className="mb-4 rounded-lg border border-[var(--zuri-border)] bg-[var(--zuri-surface)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Star className="h-4 w-4 fill-[#C9A84C] text-[#C9A84C]" />
        <p className="text-sm text-[var(--zuri-foreground)]">
          {avg != null ? (
            <>
              Average content rating:{" "}
              <span className="font-semibold text-[#C9A84C]">{avg} ★</span>{" "}
              <span className="text-[var(--zuri-muted)]">({count} rated)</span>
            </>
          ) : (
            <span className="text-[var(--zuri-muted)]">
              No ratings yet — rate generated posts to see what&apos;s working
            </span>
          )}
        </p>
      </div>
      <p className="mt-1 text-xs text-[var(--zuri-muted)]">
        {count >= 5 && topPillar
          ? `${topPillar} posts are your highest-rated pillar.`
          : "Rate a few more posts to see what\u2019s working"}
      </p>
    </div>
  );
}
