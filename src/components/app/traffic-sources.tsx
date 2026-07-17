import type { ReferrerShare } from "@/lib/analytics/website-stats";

type Props = {
  sources: ReferrerShare[];
};

export function TrafficSourcesBreakdown({ sources }: Props) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No traffic sources in this range yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((s, i) => {
        const opacity = Math.max(0.35, 1 - i * 0.18);
        return (
          <li key={s.domain}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{s.domain}</span>
              <span className="font-mono text-muted-foreground">
                {s.share}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${s.share}%`,
                  background: `color-mix(in srgb, var(--gold, #d4a656) ${Math.round(opacity * 100)}%, transparent)`,
                  backgroundColor: `rgba(212, 166, 86, ${opacity})`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
