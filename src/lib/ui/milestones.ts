"use client";

import { toast } from "sonner";

/** Celebratory milestone toast — reserve for real moments, not routine saves */
export function celebrateMilestone(
  title: string,
  description?: string
): void {
  toast.success(title, {
    description,
    duration: 5000,
    className: "milestone-toast",
  });
}

export function celebrateFirstPublish(url?: string) {
  celebrateMilestone(
    "Your website is live",
    url
      ? `Published at ${url}. Share it with your first customers.`
      : "Your presence is online. Share it with your first customers."
  );
}

export function celebrateStreak(days: number) {
  if (days === 7 || days === 30 || days % 7 === 0) {
    celebrateMilestone(
      `${days}-day consistency streak`,
      "Showing up compounds. Keep the gold dots filling."
    );
  }
}

export function celebrateFirstLead() {
  celebrateMilestone(
    "First contact form submission",
    "Someone reached out through your site. Check your inbox."
  );
}
