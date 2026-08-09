// src/components/content/ContentMonthGrid.tsx
"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalMomentBadge } from "@/components/content/LocalMomentBadge";
import { StudioModal } from "@/components/app/website-studio/StudioModal";
import { SlotCard } from "@/components/app/content-calendar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { ContentCalendarRow } from "@/types/database";

type SlotWithPillar = ContentCalendarRow & {
  content_pillars?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
};

export function ContentMonthGrid({
  year,
  month,
  slots,
  activeId,
  onSelect,
}: {
  year: number;
  month: number;
  slots: SlotWithPillar[];
  activeId?: string | null;
  onSelect: (slot: SlotWithPillar) => void;
}) {
  const isMobile = useIsMobile();
  // Which day number's bottom sheet is open, mobile only. Desktop never
  // sets this — it still opens the slot detail drawer directly via
  // onSelect, same as before.
  const [openDay, setOpenDay] = useState<number | null>(null);

  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  // Monday-first grid
  const startPad = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<number, SlotWithPillar[]>();
  for (const s of slots) {
    const day = Number(s.scheduled_date.slice(8, 10));
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openDaySlots = openDay != null ? byDay.get(openDay) ?? [] : [];
  const openDayLabel =
    openDay != null
      ? new Date(year, month - 1, openDay).toLocaleDateString("en-NG", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((d) => (
          <div
            key={d}
            className="px-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          const daySlots = day ? byDay.get(day) ?? [] : [];
          const hasCultural = daySlots.some((s) => s.is_cultural_moment);

          // ─── Mobile: compact heatmap cell ───────────────────────────
          // Just the date + up to 3 pillar-colored dots (+N if more) + a
          // single small marker for a cultural moment. Tapping opens a
          // bottom sheet listing that day's posts as full SlotCards —
          // the same cards List view already uses, so the interaction
          // and detail drawer behavior is identical either way.
          if (isMobile) {
            const dots = daySlots.slice(0, 3);
            const overflow = daySlots.length - dots.length;
            return (
              <button
                key={idx}
                type="button"
                disabled={day == null || daySlots.length === 0}
                onClick={() => day != null && setOpenDay(day)}
                className={cn(
                  "flex min-h-[56px] flex-col items-center gap-1.5 rounded-md border border-border/60 bg-[var(--bg-secondary)]/40 px-1 py-2 transition-transform active:scale-[0.96]",
                  day == null && "opacity-30",
                  hasCultural && "border-[#C9A84C]/40 bg-[#C9A84C]/5"
                )}
              >
                {day != null && (
                  <>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {day}
                    </span>
                    {daySlots.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {dots.map((s) => (
                          <span
                            key={s.id}
                            className="size-1.5 shrink-0 rounded-full"
                            style={{
                              background: s.content_pillars?.color ?? "#C9A84C",
                            }}
                          />
                        ))}
                        {overflow > 0 && (
                          <span className="text-[8px] leading-none text-muted-foreground">
                            +{overflow}
                          </span>
                        )}
                      </span>
                    )}
                    {hasCultural && (
                      <MapPin className="size-2.5 text-[#C9A84C]" strokeWidth={2.5} />
                    )}
                  </>
                )}
              </button>
            );
          }

          // ─── Desktop/tablet: unchanged full cell ────────────────────
          return (
            <div
              key={idx}
              className={cn(
                "min-h-[88px] rounded-md border border-border/60 bg-[var(--bg-secondary)]/40 p-1.5",
                day == null && "opacity-30",
                hasCultural && "border-[#C9A84C]/40 bg-[#C9A84C]/5"
              )}
            >
              {day != null && (
                <>
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                    {day}
                  </p>
                  <div className="space-y-1">
                    {daySlots.slice(0, 3).map((s) => {
                      const color = s.content_pillars?.color ?? "#C9A84C";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onSelect(s)}
                          className={cn(
                            "w-full rounded-sm border border-transparent px-1 py-0.5 text-left transition-colors hover:border-border",
                            activeId === s.id && "border-[#C9A84C]/50 bg-[#C9A84C]/10"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ background: color }}
                            />
                            <span className="truncate text-[10px] font-medium text-[var(--text-primary)]">
                              {s.topic}
                            </span>
                          </span>
                          {s.is_cultural_moment && (
                            <LocalMomentBadge compact className="mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                    {daySlots.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{daySlots.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile day sheet — reuses the exact SlotCard component List view
          uses, so tapping a post here opens the same detail drawer with
          identical behavior, not a second parallel UI. */}
      <StudioModal
        open={openDay != null}
        onClose={() => setOpenDay(null)}
        title={openDayLabel}
        size="lg"
      >
        <div className="space-y-2.5">
          {openDaySlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              open={activeId === slot.id}
              onClick={() => {
                onSelect(slot);
                setOpenDay(null);
              }}
            />
          ))}
        </div>
      </StudioModal>
    </div>
  );
}
