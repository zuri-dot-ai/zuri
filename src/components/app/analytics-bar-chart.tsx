"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/analytics/website-stats";

type Props = {
  series: DailyPoint[];
};

export function AnalyticsBarChart({ series }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((p) => p.views));

  // Show at most ~14 label ticks for dense ranges
  const labelEvery = series.length > 14 ? Math.ceil(series.length / 10) : 1;

  return (
    <div className="bar-chart-wrap">
      <div className="bar-chart" role="img" aria-label="Traffic over time">
        {series.map((point, i) => {
          const heightPct = Math.max(2, (point.views / max) * 100);
          const showLabel = i % labelEvery === 0 || i === series.length - 1;
          const dayLabel = point.date.slice(5); // MM-DD
          return (
            <div key={point.date} className="bar-col">
              <div className="relative flex w-full flex-1 items-end justify-center">
                {hover === i && (
                  <div className="bar-tooltip" role="tooltip">
                    <span className="font-mono">{point.views}</span>
                    <span className="opacity-70"> views</span>
                    <br />
                    <span className="text-[10px] opacity-70">{point.date}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="bar"
                  style={{ height: `${heightPct}%` }}
                  aria-label={`${point.date}: ${point.views} views`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </div>
              <span className="bar-label">
                {showLabel ? dayLabel : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
