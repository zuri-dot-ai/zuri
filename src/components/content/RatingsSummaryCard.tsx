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
      content_pillars?: { name?: string; color?: string | null } | null;
    } | null;
  } | null;
};

export function RatingsSummaryCard() {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [topPillar, setTopPillar] = useState<{ name: string; color: string | null } | null>(
    null
  );
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
            const byPillar = new Map<
              string,
              { sum: number; n: number; color: string | null }
            >();
            for (const r of rows) {
              const pillar = r.generated_content?.content_calendar?.content_pillars;
              if (!pillar?.name) continue;
              const cur =
                byPillar.get(pillar.name) ?? { sum: 0, n: 0, color: pillar.color ?? null };
              cur.sum += r.rating;
              cur.n += 1;
              byPillar.set(pillar.name, cur);
            }
            let best: { name: string; color: string | null } | null = null;
            let bestAvg = -1;
            for (const [name, { sum, n, color }] of byPillar) {
              const a = sum / n;
              if (a > bestAvg) {
                bestAvg = a;
                best = { name, color };
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
    <div className="content-card mb-4 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Star className="h-4 w-4 fill-[#C9A84C] text-[#C9A84C]" />
        <p className="text-card-body">
          {avg != null ? (
            <>
              Average content rating:{" "}
              <span className="font-semibold text-[#C9A84C]">{avg} ★</span>{" "}
              <span className="text-card-meta">({count} rated)</span>
            </>
          ) : (
            <span className="text-card-meta">
              No ratings yet — rate generated posts to see what&apos;s working
            </span>
          )}
        </p>
      </div>
      <p className="mt-1 text-card-meta">
        {count >= 5 && topPillar ? (
          <>
            <span style={{ color: topPillar.color ?? "#C9A84C" }} className="font-medium">
              {topPillar.name}
            </span>{" "}
            posts are your highest-rated pillar.
          </>
        ) : (
          "Rate a few more posts to see what\u2019s working"
        )}
      </p>
    </div>
  );
}
