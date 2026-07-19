import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  unlocked: boolean;
};

export function ContentPerformanceTeaser({ unlocked }: Props) {
  if (unlocked) {
    return (
      <section className="surface p-6">
        <h3 className="text-sm font-medium">Content performance</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Which 90-day plan pieces drove the most traffic and submissions.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Content-to-traffic attribution isn&apos;t linked yet — once Meta
          insights and plan posts share an ID, rankings will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="surface relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            <Lock className="size-3" strokeWidth={1.75} /> Growth+
          </div>
          <h3 className="text-sm font-medium">Content performance</h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            See which pieces from your 90-day plan drove the most traffic and
            form submissions — tied back to your content strategy.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/settings?tab=billing">Upgrade to Growth</Link>
        </Button>
      </div>
    </section>
  );
}
