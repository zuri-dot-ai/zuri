// ════════════════════════════════════════════════════════
//  ZURI — Nigerian Cultural Calendar
//  Static dataset of Nigerian cultural moments used for
//  automatic injection into content calendar generation.
// ════════════════════════════════════════════════════════

export type DesignArchetype =
  | "warm-sensory"
  | "authority-minimal"
  | "luxury-aspirational"
  | "editorial-bold"
  | "clean-modern"
  | "portfolio-dramatic"
  | "community-vibrant"
  | "trust-professional";

export interface CulturalMoment {
  name: string;
  date?: string; // YYYY-MM-DD or "variable" — optional when month/day used
  month: number;
  day?: number;
  is_floating: boolean;
  applicable_to: DesignArchetype[] | "all";
  content_angle: string;
  urgency: "high" | "medium" | "low";
}

export const NIGERIAN_CULTURAL_CALENDAR: CulturalMoment[] = [
  // JANUARY
  {
    name: "New Year's Day",
    month: 1,
    day: 1,
    is_floating: false,
    applicable_to: "all",
    content_angle: "New year goals, fresh starts, what your business is doing differently this year",
    urgency: "high",
  },
  {
    name: "Back to School",
    month: 1,
    day: 8,
    is_floating: false,
    applicable_to: ["trust-professional", "authority-minimal", "clean-modern"],
    content_angle: "New term, new goals — relevant for educational or family-focused businesses",
    urgency: "medium",
  },

  // FEBRUARY
  {
    name: "Valentine's Day",
    month: 2,
    day: 14,
    is_floating: false,
    applicable_to: "all",
    content_angle: "Gift ideas, self-love, couples — adapt to your business type",
    urgency: "high",
  },

  // MARCH
  {
    name: "International Women's Day",
    month: 3,
    day: 8,
    is_floating: false,
    applicable_to: "all",
    content_angle: "Celebrate women — team, customers, or founder story",
    urgency: "high",
  },
  {
    name: "Holi / Colours Festival",
    month: 3,
    day: 10,
    is_floating: true,
    applicable_to: ["luxury-aspirational", "editorial-bold", "portfolio-dramatic"],
    content_angle: "Colour, vibrancy, creativity — visual brands can lean into this",
    urgency: "low",
  },

  // APRIL
  {
    name: "Easter Sunday",
    month: 4,
    day: 1,
    is_floating: true,
    applicable_to: "all",
    content_angle: "Celebration, renewal, family — warm and community-focused",
    urgency: "high",
  },
  {
    name: "Good Friday",
    month: 4,
    day: -2,
    is_floating: true,
    applicable_to: "all",
    content_angle: "Reflective tone — keep posts warm but understated",
    urgency: "medium",
  },

  // MAY
  {
    name: "Workers' Day / Labour Day",
    month: 5,
    day: 1,
    is_floating: false,
    applicable_to: "all",
    content_angle: "Celebrate your team and the work you do. Acknowledge your workers.",
    urgency: "medium",
  },
  {
    name: "Mother's Day",
    month: 5,
    day: 12,
    is_floating: true,
    applicable_to: "all",
    content_angle: "Celebrate mothers — gifts, experiences, or dedications",
    urgency: "high",
  },
  {
    name: "Africa Day",
    month: 5,
    day: 25,
    is_floating: false,
    applicable_to: "all",
    content_angle: "African pride, continent-wide identity, pan-African narrative",
    urgency: "medium",
  },

  // JUNE
  {
    name: "Eid al-Adha (Sallah)",
    month: 6,
    day: 1,
    is_floating: true,
    applicable_to: "all",
    content_angle: "Celebrate Sallah — warm wishes, community, food, family. Very high engagement in Nigeria.",
    urgency: "high",
  },
  {
    name: "Father's Day",
    month: 6,
    day: 16,
    is_floating: true,
    applicable_to: "all",
    content_angle: "Celebrate fathers — gifts, experiences, dedications",
    urgency: "high",
  },

  // OCTOBER
  {
    name: "Nigeria Independence Day",
    month: 10,
    day: 1,
    is_floating: false,
    applicable_to: "all",
    content_angle: "Nigerian pride, national identity, love for the country. One of the most important days to post.",
    urgency: "high",
  },
  {
    name: "Breast Cancer Awareness Month",
    month: 10,
    day: 1,
    is_floating: false,
    applicable_to: ["trust-professional", "community-vibrant"],
    content_angle: "Health awareness — early detection, self-checks, support stories",
    urgency: "medium",
  },
  {
    name: "World Mental Health Day",
    month: 10,
    day: 10,
    is_floating: false,
    applicable_to: ["trust-professional", "community-vibrant", "authority-minimal"],
    content_angle: "Mental wellness, breaking stigma, resources",
    urgency: "medium",
  },

  // NOVEMBER
  {
    name: "Black Friday",
    month: 11,
    day: 29,
    is_floating: true,
    applicable_to: ["editorial-bold", "luxury-aspirational", "warm-sensory"],
    content_angle: "Promotions, deals, special offers — even service businesses can offer limited-time deals",
    urgency: "high",
  },

  // DECEMBER
  {
    name: "Christmas Season",
    month: 12,
    day: 1,
    is_floating: false,
    applicable_to: ["warm-sensory", "luxury-aspirational", "community-vibrant", "editorial-bold"],
    content_angle: "Lagos end-of-year season — family gatherings, gifting, celebration, gratitude for the year. Frame around togetherness and thankfulness rather than nightlife.",
    urgency: "high",
  },
  {
    name: "Christmas Day",
    month: 12,
    day: 25,
    is_floating: false,
    applicable_to: "all",
    content_angle: "Celebration, family, gifts, gratitude — warmest post of the year",
    urgency: "high",
  },
  {
    name: "New Year's Eve",
    month: 12,
    day: 31,
    is_floating: false,
    applicable_to: "all",
    content_angle: "Year in review, gratitude to customers, looking ahead to next year",
    urgency: "high",
  },
];

// Floating Islamic dates — approximate yearly mapping (2025–2027)
const ISLAMIC_DATES: Record<number, Record<string, string>> = {
  2025: {
    Ramadan: "2025-03-01",
    "Eid al-Fitr": "2025-03-30",
    "Eid al-Adha (Sallah)": "2025-06-06",
  },
  2026: {
    Ramadan: "2026-02-18",
    "Eid al-Fitr": "2026-03-19",
    "Eid al-Adha (Sallah)": "2026-05-26",
  },
  2027: {
    Ramadan: "2027-02-07",
    "Eid al-Fitr": "2027-03-08",
    "Eid al-Adha (Sallah)": "2027-05-15",
  },
};

// Floating Christian dates — Easter Sunday (computed from algorithm)
function easterSunday(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Main lookup used by calendar generation
export function getNigerianCulturalMoments(
  month: number,
  year: number
): CulturalMoment[] {
  // Start with the month's fixed-date moments
  const fixed = NIGERIAN_CULTURAL_CALENDAR.filter((m) => m.month === month);

  // Resolve floating dates for the given year
  const floating: CulturalMoment[] = [];
  const easter = easterSunday(year);
  const easterMonth = easter.getMonth() + 1;

  // Islamic dates
  const islamic = ISLAMIC_DATES[year] ?? {};
  for (const [name, date] of Object.entries(islamic)) {
    const d = new Date(date);
    if (d.getMonth() + 1 === month) {
      floating.push({
        name,
        date: date,
        month,
        day: d.getDate(),
        is_floating: true,
        applicable_to: "all",
        content_angle:
          name === "Ramadan"
            ? "Iftar specials, generous spirit, community. Very high engagement for businesses."
            : name === "Eid al-Fitr"
              ? "Celebrate the end of Ramadan — warm wishes, family, gratitude"
              : "Celebrate Sallah — warm wishes, community, food, family. Very high engagement in Nigeria.",
        urgency: "high",
      });
    }
  }

  // Easter — based on year
  if (easterMonth === month) {
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);

    floating.push({
      name: "Easter Sunday",
      date: easter.toISOString().split("T")[0],
      month,
      day: easter.getDate(),
      is_floating: true,
      applicable_to: "all",
      content_angle: "Celebration, renewal, family — warm and community-focused",
      urgency: "high",
    });
    floating.push({
      name: "Good Friday",
      date: goodFriday.toISOString().split("T")[0],
      month,
      day: goodFriday.getDate(),
      is_floating: true,
      applicable_to: "all",
      content_angle: "Reflective tone — keep posts warm but understated",
      urgency: "medium",
    });
  }

  return [...fixed, ...floating];
}

// Lookup upcoming moments in the next N days (used for UI badges)
export function getUpcomingMoments(daysAhead: number = 60): CulturalMoment[] {
  const today = new Date();
  const horizon = new Date();
  horizon.setDate(today.getDate() + daysAhead);

  const all: CulturalMoment[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(horizon);
    d.setMonth(d.getMonth() + i);
    all.push(...getNigerianCulturalMoments(d.getMonth() + 1, d.getFullYear()));
  }

  return all
    .filter((m) => {
      if (!m.date || m.date === "variable") return false;
      const mDate = new Date(m.date);
      return mDate >= today && mDate <= horizon;
    })
    .sort(
      (a, b) =>
        new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()
    );
}
