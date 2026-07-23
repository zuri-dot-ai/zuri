"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { ServiceEntry } from "@/lib/onboarding/types";

const MAX_SERVICES = 6;
const MAX_NAME_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 70;

interface ServiceRepeaterInputProps {
  value: ServiceEntry[];
  onChange: (services: ServiceEntry[]) => void;
  suggestions?: string[];
}

/**
 * Onboarding V2 Step 2 (docs/01_ONBOARDING_V2.md §4 Step 2) — one visible
 * name+description row at a time. "Add another service" commits the current
 * row as a collapsed chip and clears the inputs, keeping screen height
 * constant regardless of how many services have been added.
 */
export function ServiceRepeaterInput({
  value,
  onChange,
  suggestions = [],
}: ServiceRepeaterInputProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [maxReachedNotice, setMaxReachedNotice] = useState(false);

  const canCommitCurrent =
    sanitizeText(name).length >= 2 && sanitizeText(description).length >= 10;

  function commitCurrentRow() {
    if (!canCommitCurrent) return;

    const entry: ServiceEntry = {
      name: sanitizeText(name).slice(0, MAX_NAME_LENGTH),
      description: sanitizeText(description).slice(0, MAX_DESCRIPTION_LENGTH),
    };

    if (editingIndex !== null) {
      const next = [...value];
      next[editingIndex] = entry;
      onChange(next);
      setEditingIndex(null);
    } else {
      if (value.length >= MAX_SERVICES) {
        setMaxReachedNotice(true);
        return;
      }
      onChange([...value, entry]);
    }

    setName("");
    setDescription("");
    setMaxReachedNotice(false);
  }

  function editChip(index: number) {
    const entry = value[index];
    setName(entry.name);
    setDescription(entry.description);
    setEditingIndex(index);
  }

  function removeChip(index: number) {
    onChange(value.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setName("");
      setDescription("");
    }
  }

  const atMax = value.length >= MAX_SERVICES && editingIndex === null;

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((entry, i) => (
            <span
              key={`${entry.name}-${i}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                editingIndex === i
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              )}
            >
              <button
                type="button"
                onClick={() => editChip(i)}
                className="max-w-[160px] truncate"
                title="Tap to edit"
              >
                {entry.name}
              </button>
              <button
                type="button"
                onClick={() => removeChip(i)}
                aria-label={`Remove ${entry.name}`}
                className="text-[var(--text-tertiary)] hover:text-error"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {!atMax && (
        <div className="onboarding-panel space-y-3">
          <div className="space-y-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Custom Cakes"
              className="onboarding-input h-11"
              maxLength={MAX_NAME_LENGTH}
            />
            {suggestions.length > 0 && !name && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setName(s)}
                    className="rounded-full border border-border bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Input
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
              }
              // Auto-commit on blur so a valid row is never lost if the user
              // taps "Continue" without pressing "Add another service".
              onBlur={commitCurrentRow}
              placeholder="Birthday, wedding, and celebration cakes made to order"
              className="onboarding-input h-11"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <p
              className={cn(
                "text-right text-xs",
                description.length >= MAX_DESCRIPTION_LENGTH
                  ? "text-error"
                  : "text-[var(--text-tertiary)]"
              )}
            >
              {description.length} / {MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          <button
            type="button"
            onClick={commitCurrentRow}
            disabled={!canCommitCurrent}
            className={cn(
              "min-h-[44px] w-full rounded-sm border border-dashed border-border text-sm text-[var(--text-secondary)] transition-colors duration-150",
              canCommitCurrent
                ? "hover:border-gold hover:text-gold"
                : "cursor-not-allowed opacity-40"
            )}
          >
            {editingIndex !== null ? "Save changes" : "Add another service +"}
          </button>
        </div>
      )}

      {maxReachedNotice && (
        <p className="text-sm text-error">
          You&apos;ve reached the maximum of {MAX_SERVICES} services — that&apos;s
          exactly how many can appear on your website.
        </p>
      )}
    </div>
  );
}
