"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import type { ServiceEntry } from "@/lib/onboarding/types";

const MAX_SERVICES = 6;
const MAX_NAME_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 70;

interface ServiceRepeaterInputProps {
  value: ServiceEntry[];
  onChange: (services: ServiceEntry[]) => void;
  suggestions?: string[];
  sessionToken?: string;
  businessType?: string;
  /** Combined chip + draft validity for Continue. */
  onValidityChange?: (valid: boolean) => void;
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
  sessionToken = "",
  businessType = "",
  onValidityChange,
}: ServiceRepeaterInputProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [maxReachedNotice, setMaxReachedNotice] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canCommitCurrent =
    sanitizeText(name).length >= 2 && sanitizeText(description).length >= 10;
  const canGenerate =
    sanitizeText(name).length >= 2 && Boolean(sessionToken) && !generating;

  const valueRef = useRef(value);
  const nameRef = useRef(name);
  const descriptionRef = useRef(description);
  const editingIndexRef = useRef(editingIndex);
  valueRef.current = value;
  nameRef.current = name;
  descriptionRef.current = description;
  editingIndexRef.current = editingIndex;

  useEffect(() => {
    onValidityChange?.(value.length >= 1 || canCommitCurrent);
  }, [value.length, canCommitCurrent, onValidityChange]);

  function commitCurrentRow() {
    const cleanName = sanitizeText(nameRef.current);
    const cleanDesc = sanitizeText(descriptionRef.current);
    if (cleanName.length < 2 || cleanDesc.length < 10) return;

    const entry: ServiceEntry = {
      name: cleanName.slice(0, MAX_NAME_LENGTH),
      description: cleanDesc.slice(0, MAX_DESCRIPTION_LENGTH),
    };

    const current = valueRef.current;
    const editIdx = editingIndexRef.current;

    if (editIdx !== null) {
      const next = [...current];
      next[editIdx] = entry;
      onChange(next);
      setEditingIndex(null);
    } else {
      if (current.length >= MAX_SERVICES) {
        setMaxReachedNotice(true);
        return;
      }
      onChange([...current, entry]);
    }

    setName("");
    setDescription("");
    setMaxReachedNotice(false);
  }

  // Flush a valid draft when leaving the step (e.g. Continue) so it isn't lost.
  useEffect(() => {
    return () => {
      const cleanName = sanitizeText(nameRef.current);
      const cleanDesc = sanitizeText(descriptionRef.current);
      if (cleanName.length < 2 || cleanDesc.length < 10) return;

      const entry: ServiceEntry = {
        name: cleanName.slice(0, MAX_NAME_LENGTH),
        description: cleanDesc.slice(0, MAX_DESCRIPTION_LENGTH),
      };
      const current = valueRef.current;
      const editIdx = editingIndexRef.current;

      if (editIdx !== null) {
        const next = [...current];
        next[editIdx] = entry;
        onChange(next);
        return;
      }
      if (current.length >= MAX_SERVICES) return;
      onChange([...current, entry]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush once on unmount with latest refs
  }, []);

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

  async function generateDescription() {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const result = await safeFetchJSON<{ description: string }>(
        "/api/onboarding/generate-service-description",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            serviceName: sanitizeText(name),
            businessType,
          }),
        }
      );
      const next = (result.description ?? "")
        .trim()
        .slice(0, MAX_DESCRIPTION_LENGTH);
      if (next) setDescription(next);
    } catch (err) {
      toast.error(
        err instanceof FetchError
          ? err.message
          : "Couldn't generate — try again or type your own."
      );
    } finally {
      setGenerating(false);
    }
  }

  const atMax = value.length >= MAX_SERVICES && editingIndex === null;
  const addLabel =
    editingIndex !== null
      ? "Save changes"
      : value.length >= 1
        ? "Add another service +"
        : "Add service +";

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
              onBlur={commitCurrentRow}
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
            <div className="flex items-center justify-between gap-2">
              <label className="onboarding-label" htmlFor="service-description">
                Description
              </label>
              {sanitizeText(name).length >= 2 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={generateDescription}
                  disabled={!canGenerate}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs text-gold transition-opacity",
                    !canGenerate && "cursor-not-allowed opacity-40"
                  )}
                >
                  {generating ? (
                    <span className="zuri-spinner !size-3" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  {generating ? "Generating…" : "Generate with AI"}
                </button>
              )}
            </div>
            <Input
              id="service-description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
              }
              onBlur={commitCurrentRow}
              placeholder="Describe this service — what does it include, what makes it different?"
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
            {addLabel}
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
