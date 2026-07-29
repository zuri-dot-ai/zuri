"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AdjustMode =
  | "punchier"
  | "shorter"
  | "more_formal"
  | "more_casual"
  | "custom";

const QUICK: { mode: AdjustMode; label: string }[] = [
  { mode: "punchier", label: "Make it punchier" },
  { mode: "shorter", label: "Make it shorter" },
  { mode: "more_formal", label: "More formal" },
  { mode: "more_casual", label: "More casual" },
];

export function ContentAdjustControls({
  loading,
  onAdjust,
  className,
}: {
  loading?: boolean;
  onAdjust: (mode: AdjustMode, instruction?: string) => void;
  className?: string;
}) {
  const [custom, setCustom] = useState("");

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-label">Adjust</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <Button
            key={q.mode}
            size="sm"
            variant="outline"
            disabled={loading}
            className="h-8 text-xs"
            onClick={() => onAdjust(q.mode)}
          >
            {loading ? (
              <span className="zuri-spinner mr-1 !size-3" />
            ) : null}
            {q.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          disabled={loading}
          placeholder="Regenerate with instructions…"
          className="h-9 text-xs"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) {
              onAdjust("custom", custom.trim());
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={loading || !custom.trim()}
          onClick={() => onAdjust("custom", custom.trim())}
        >
          Go
        </Button>
      </div>
    </div>
  );
}
