"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import type { ActiveTheme } from "@/types/website";

const THEMES: { id: ActiveTheme; label: string; swatch: string }[] = [
  { id: "theme-1", label: "Primary", swatch: "bg-[#C9A84C]" },
  { id: "theme-2", label: "Secondary", swatch: "bg-[#1a1a2e]" },
  { id: "theme-3", label: "Accent", swatch: "bg-[#e8e4dc]" },
];

export function ThemePanel({
  activeTheme,
  onThemeChange,
}: {
  activeTheme: ActiveTheme;
  onThemeChange: (theme: ActiveTheme, needsReview?: boolean) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function select(theme: ActiveTheme) {
    if (theme === activeTheme) return;
    setBusy(theme);
    try {
      const data = await safeFetchJSON<{ needsReview?: boolean }>(
        "/api/website/theme",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme }),
        }
      );
      onThemeChange(theme, data.needsReview);
      toast.success("Theme updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Theme update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-card-body">
        Pick a color theme. Changes apply instantly to your preview.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((t) => {
          const selected = activeTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={busy !== null}
              onClick={() => select(t.id)}
              className={cn(
                "content-card relative p-4 text-left",
                selected && "content-card--active"
              )}
            >
              <div
                className={cn("mb-3 h-10 w-full rounded-sm", t.swatch)}
              />
              <p className="text-card-title">{t.label}</p>
              <p className="text-card-meta">{t.id}</p>
              {selected && (
                <Check className="absolute right-3 top-3 size-4 text-gold" />
              )}
              {busy === t.id && (
                <span className="absolute right-3 top-3 text-label">
                  …
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
