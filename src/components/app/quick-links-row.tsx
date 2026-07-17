import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Globe,
  Lock,
  Store,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QuickLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  growthPlus?: boolean;
};

const LINKS: QuickLink[] = [
  {
    href: "/website",
    label: "Edit website",
    description: "Tweaks, publish, domain",
    icon: Globe,
  },
  {
    href: "/analytics",
    label: "View analytics",
    description: "Traffic & submissions",
    icon: BarChart3,
  },
  {
    href: "/content",
    label: "Content calendar",
    description: "Full 90-day view",
    icon: CalendarDays,
  },
  {
    href: "/agencies",
    label: "Agency marketplace",
    description: "Vetted execution partners",
    icon: Store,
    growthPlus: true,
  },
];

type Props = {
  agenciesUnlocked: boolean;
};

export function QuickLinksRow({ agenciesUnlocked }: Props) {
  return (
    <section>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Quick links
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map(({ href, label, description, icon: Icon, growthPlus }) => {
          const locked = !!growthPlus && !agenciesUnlocked;
          const target = locked ? "/settings?tab=billing" : href;
          return (
            <Link
              key={href}
              href={target}
              className="block"
              aria-label={
                locked ? `${label} — Growth+ required` : label
              }
            >
              <div
                className={cn(
                  "surface group flex h-full flex-col gap-3 p-5",
                  locked && "opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-[10px] bg-gold/10 text-gold">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </div>
                  {locked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
                      <Lock className="size-3" /> Growth+
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {locked ? "Upgrade to unlock partners" : description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
