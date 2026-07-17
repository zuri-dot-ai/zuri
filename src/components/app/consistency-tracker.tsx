import { cn } from "@/lib/utils";

export type ConsistencyDay = {
  date: string; // YYYY-MM-DD
  label: string; // Mon, Tue…
  done: boolean;
};

type Props = {
  days: ConsistencyDay[];
  streak: number;
};

export function ConsistencyTracker({ days, streak }: Props) {
  return (
    <section className="surface p-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Consistency this week</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Gold = published · hollow = missed
          </p>
        </div>
        <p className="font-mono text-sm text-gold">
          {streak} day streak
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex flex-1 flex-col items-center gap-2"
            title={d.date}
          >
            <span
              className={cn(
                "consistency-dot",
                d.done ? "consistency-dot--done" : "consistency-dot--missed"
              )}
              aria-label={`${d.label}: ${d.done ? "done" : "missed"}`}
            />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
