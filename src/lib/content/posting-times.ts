// ════════════════════════════════════════════════════════
//  ZURI — Optimal Posting Times (Nigerian Audience)
//  All times in WAT (West Africa Time, UTC+1)
// ════════════════════════════════════════════════════════

export interface PostingTimeConfig {
  best_days: string[];
  best_times: string[]; // HH:MM in WAT
  avoid_days: string[];
  avoid_times_before: string; // HH:MM
  avoid_times_after: string; // HH:MM
  notes: string;
}

export const OPTIMAL_POSTING_TIMES: Record<string, PostingTimeConfig> = {
  instagram: {
    best_days: ["Tuesday", "Wednesday", "Thursday", "Friday"],
    best_times: ["07:30", "12:00", "19:00", "21:00"],
    avoid_days: ["Sunday"],
    avoid_times_before: "06:00",
    avoid_times_after: "23:00",
    notes: "Evening (7–9pm WAT) is peak engagement for Nigerian Instagram users",
  },
  facebook: {
    best_days: ["Monday", "Wednesday", "Thursday", "Friday", "Saturday"],
    best_times: ["08:00", "12:30", "19:30"],
    avoid_days: [],
    avoid_times_before: "07:00",
    avoid_times_after: "22:00",
    notes: "Facebook sees strong daytime engagement from Nigerian professionals during lunch hours",
  },
  linkedin: {
    best_days: ["Tuesday", "Wednesday", "Thursday"],
    best_times: ["08:00", "12:00", "17:30"],
    avoid_days: ["Saturday", "Sunday"],
    avoid_times_before: "07:00",
    avoid_times_after: "19:00",
    notes: "LinkedIn performs best mid-week during business hours in Nigeria",
  },
  x: {
    best_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    best_times: ["07:00", "12:00", "17:00", "20:00"],
    avoid_days: [],
    avoid_times_before: "06:00",
    avoid_times_after: "23:00",
    notes: "Nigerian Twitter/X users are most active in the mornings and evenings",
  },
  tiktok: {
    best_days: ["Tuesday", "Thursday", "Friday", "Saturday"],
    best_times: ["19:00", "21:00", "22:00"],
    avoid_days: ["Monday"],
    avoid_times_before: "12:00",
    avoid_times_after: "23:30",
    notes: "TikTok peaks late evening for Nigerian users — 7pm to midnight WAT",
  },
  email: {
    best_days: ["Tuesday", "Wednesday", "Thursday"],
    best_times: ["09:00", "14:00"],
    avoid_days: ["Saturday", "Sunday"],
    avoid_times_before: "07:00",
    avoid_times_after: "21:00",
    notes: "Email performs well mid-morning on weekdays for Nigerian business audiences",
  },
};

export function getSuggestedTime(platform: string, date: Date): string {
  const config = OPTIMAL_POSTING_TIMES[platform];
  if (!config) return "12:00";
  const index = date.getDate() % config.best_times.length;
  return config.best_times[index];
}

export function getPostingTimesForPlatform(
  platform: string
): PostingTimeConfig | null {
  return OPTIMAL_POSTING_TIMES[platform] ?? null;
}
