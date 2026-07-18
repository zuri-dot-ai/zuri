"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "zuri_first_visit_tour_dismissed";

const STEPS = [
  {
    title: "Today's Action",
    body: "Start here each day — one clear next step for your business.",
    href: "/dashboard",
  },
  {
    title: "Website editor",
    body: "Preview your site, tweak copy, and publish when you're ready.",
    href: "/website",
  },
  {
    title: "Content calendar",
    body: "Your 90-day plan lives here — drafts ready to post.",
    href: "/content",
  },
];

/** One-time guided highlight on first dashboard visit */
export function FirstVisitTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
      setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    setStep((s) => s + 1);
  }

  if (!visible) return null;
  const current = STEPS[step];

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[90] mx-auto max-w-md border border-gold/40 bg-background p-5 shadow-[var(--elevation-3)] md:bottom-8 md:left-auto md:right-8 page-enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gold">
            Quick tour · {step + 1}/{STEPS.length}
          </p>
          <h3 className="mt-1 font-heading text-xl font-medium">{current.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss tour"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={current.href}>Open</Link>
        </Button>
        <Button size="sm" onClick={next}>
          {step >= STEPS.length - 1 ? "Done" : "Next"}
        </Button>
      </div>
    </div>
  );
}
