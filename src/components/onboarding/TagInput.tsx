"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";

const SERVICE_PATTERN = /^[a-zA-Z0-9\s\-&/]+$/;
const BLOCKED = new Set(["drop", "select", "insert", "delete"]);
const MAX_SERVICES = 8;

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type a service and press Enter",
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function tryAdd(raw: string) {
    const clean = sanitizeText(raw);
    if (!clean) return;

    if (value.length >= MAX_SERVICES) {
      setError(
        "You've reached the maximum of 8 services. Remove one to add another."
      );
      return;
    }

    if (clean.length < 2) {
      setError("Service name must be at least 2 characters.");
      return;
    }

    if (clean.length > 50) {
      setError("Service name must be 50 characters or fewer.");
      return;
    }

    if (!SERVICE_PATTERN.test(clean) || !/[a-zA-Z]/.test(clean)) {
      setError(
        "Service names can only contain letters, numbers, and basic punctuation."
      );
      return;
    }

    if (BLOCKED.has(clean.toLowerCase())) {
      setError(
        "Service names can only contain letters, numbers, and basic punctuation."
      );
      return;
    }

    // Duplicates: silently ignore
    if (value.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setDraft("");
      setError(null);
      return;
    }

    onChange([...value, clean]);
    setDraft("");
    setError(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      tryAdd(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
      setError(null);
    }
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-gold"
          >
            {tag}
            <button
              type="button"
              onClick={() => {
                onChange(value.filter((t) => t !== tag));
                setError(null);
              }}
              className="rounded-full p-0.5 hover:bg-gold/20"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <Input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) tryAdd(draft);
        }}
        placeholder={placeholder}
        disabled={value.length >= MAX_SERVICES}
        className="h-12 border-white/10 bg-white/[0.02]"
      />

      <p className="text-xs text-muted-foreground">
        {value.length} of {MAX_SERVICES} services added
      </p>

      {error && <p className="text-sm text-error">{error}</p>}

      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => tryAdd(s)}
              className="rounded-full border border-white/10 bg-transparent px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
