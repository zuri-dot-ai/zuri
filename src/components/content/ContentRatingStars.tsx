"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { toast } from "sonner";

const GOLD = "#C9A84C";

export function ContentRatingStars({
  contentId,
  initialRating = 0,
  className,
  onRated,
}: {
  contentId: string;
  initialRating?: number;
  className?: string;
  onRated?: (rating: number) => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  async function submit(next: number) {
    if (saving) return;
    setSaving(true);
    const prev = rating;
    setRating(next);
    try {
      await safeFetchJSON(`/api/content/${contentId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: next }),
      });
      onRated?.(next);
    } catch (e) {
      setRating(prev);
      toast.error(e instanceof Error ? e.message : "Could not save rating");
    } finally {
      setSaving(false);
    }
  }

  const display = hover || rating;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-card-meta">
        {rating > 0
          ? `Rated ${"★".repeat(rating)}${"☆".repeat(5 - rating)} — tap to change`
          : "Rate this content"}
      </p>
      <div className="flex items-center gap-1" role="group" aria-label="Content rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={saving}
            aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => void submit(n)}
            className="rounded p-1 transition-transform [transition-duration:var(--transition-fast)] hover:scale-110 disabled:opacity-50"
          >
            <Star
              className="h-5 w-5 transition-colors [transition-duration:var(--transition-fast)]"
              style={{
                color: GOLD,
                fill: n <= display ? GOLD : "transparent",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
