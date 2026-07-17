import Link from "next/link";

export type ActivityItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  href?: string | null;
};

type Props = {
  items: ActivityItem[];
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentActivityFeed({ items }: Props) {
  return (
    <section className="surface overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-medium">Recent activity</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No activity yet — publish content or receive a form submission to see
          it here.
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="border-b border-border last:border-b-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <ActivityBody item={item} />
                </Link>
              ) : (
                <div className="flex gap-3 px-5 py-3.5">
                  <ActivityBody item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityBody({ item }: { item: ActivityItem }) {
  return (
    <>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-gold">
        ●
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{item.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.body}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {relativeTime(item.time)}
        </p>
      </div>
    </>
  );
}
