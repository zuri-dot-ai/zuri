"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZuriSpinner } from "@/components/ui/skeleton";
import {
  generateHandle,
  sanitizeHandleInput,
  validateHandle,
} from "@/lib/handle/client";
import { cn } from "@/lib/utils";
import { formatPublicSiteUrlLabel } from "@/lib/website/public-site-url";

type Availability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | {
      status: "unavailable";
      reason: string;
      suggestions?: string[];
      message: string;
    }
  | { status: "error"; message: string };

interface HandleInputProps {
  businessName: string;
  value: string;
  onChange: (handle: string) => void;
  onAvailabilityChange: (available: boolean, checking: boolean) => void;
  className?: string;
}

export function HandleInput({
  businessName,
  value,
  onChange,
  onAvailabilityChange,
  className,
}: HandleInputProps) {
  const [availability, setAvailability] = useState<Availability>({
    status: "idle",
  });
  const [userEdited, setUserEdited] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fill from business name until user edits
  useEffect(() => {
    if (userEdited) return;
    const generated = generateHandle(businessName);
    if (generated !== value) {
      onChange(generated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only react to businessName
  }, [businessName, userEdited]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const clean = value.toLowerCase().trim();
    if (!clean) {
      setAvailability({ status: "idle" });
      onAvailabilityChange(false, false);
      return;
    }

    const validation = validateHandle(clean);
    if (!validation.valid) {
      setAvailability({
        status: "unavailable",
        reason: "invalid_format",
        message: validation.error ?? "Invalid handle",
      });
      onAvailabilityChange(false, false);
      return;
    }

    setAvailability({ status: "checking" });
    onAvailabilityChange(false, true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/handle/check?handle=${encodeURIComponent(clean)}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (!res.ok) {
          setAvailability({
            status: "error",
            message: "Couldn't check availability. Tap to retry.",
          });
          onAvailabilityChange(false, false);
          return;
        }

        if (data.available) {
          setAvailability({ status: "available" });
          onAvailabilityChange(true, false);
        } else {
          const reason = data.reason as string;
          let message = "This handle is taken.";
          if (reason === "reserved") {
            message = "This handle is reserved. Please choose a different one.";
          } else if (reason === "taken" && data.suggestions?.length) {
            message = `This handle is taken. Try: ${data.suggestions.join(", ")}`;
          } else if (reason === "invalid_format") {
            message = "Handle format is invalid.";
          }
          setAvailability({
            status: "unavailable",
            reason,
            suggestions: data.suggestions,
            message,
          });
          onAvailabilityChange(false, false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAvailability({
          status: "error",
          message: "Couldn't check availability. Tap to retry.",
        });
        onAvailabilityChange(false, false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value, onAvailabilityChange]);

  function retry() {
    // Force re-check by toggling via same value
    onChange(value);
    setAvailability({ status: "checking" });
    onAvailabilityChange(false, true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/handle/check?handle=${encodeURIComponent(value.toLowerCase().trim())}`
        );
        const data = await res.json();
        if (!res.ok || !data.available) {
          setAvailability({
            status: data.available === false ? "unavailable" : "error",
            reason: data.reason ?? "error",
            suggestions: data.suggestions,
            message:
              data.available === false
                ? data.reason === "reserved"
                  ? "This handle is reserved. Please choose a different one."
                  : data.suggestions?.length
                    ? `This handle is taken. Try: ${data.suggestions.join(", ")}`
                    : "This handle is taken."
                : "Couldn't check availability. Tap to retry.",
          } as Availability);
          onAvailabilityChange(false, false);
          return;
        }
        setAvailability({ status: "available" });
        onAvailabilityChange(true, false);
      } catch {
        setAvailability({
          status: "error",
          message: "Couldn't check availability. Tap to retry.",
        });
        onAvailabilityChange(false, false);
      }
    })();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="handle" className="text-sm text-muted-foreground">
        Your Zuri address
      </Label>
      <div className="relative">
        <Input
          id="handle"
          value={value}
          onChange={(e) => {
            setUserEdited(true);
            onChange(sanitizeHandleInput(e.target.value));
          }}
          placeholder="your-business"
          className="onboarding-input h-11 pr-10 font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          {availability.status === "checking" && <ZuriSpinner size={16} />}
          {availability.status === "available" && (
            <Check className="size-4 text-success" />
          )}
          {availability.status === "unavailable" && (
            <X className="size-4 text-error" />
          )}
          {availability.status === "error" && (
            <button
              type="button"
              onClick={retry}
              className="pointer-events-auto text-muted-foreground hover:text-gold"
              aria-label="Retry availability check"
            >
              <RefreshCw className="size-4" />
            </button>
          )}
        </span>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {formatPublicSiteUrlLabel(value || "handle")}
      </p>
      {availability.status === "unavailable" && (
        <div className="space-y-1.5">
          <p className="text-sm text-error">{availability.message}</p>
          {availability.suggestions && availability.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availability.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setUserEdited(true);
                    onChange(s);
                  }}
                  className="rounded-sm border border-border bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-xs text-gold transition-colors hover:border-gold"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {availability.status === "error" && (
        <p className="text-sm text-error">{availability.message}</p>
      )}
    </div>
  );
}
