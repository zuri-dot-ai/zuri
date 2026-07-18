/**
 * Content calendar seeding helpers.
 * Calendar generation is triggered from onboarding via /api/content/seed-calendar;
 * keep this module as a typed placeholder for shared generators.
 */

export type CalendarSeedStatus = "queued" | "seeded" | "failed";

export interface CalendarSeedResult {
  status: CalendarSeedStatus;
  slotsCreated?: number;
  error?: string;
}

export function emptyCalendarSeed(): CalendarSeedResult {
  return { status: "queued" };
}
