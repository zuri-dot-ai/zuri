"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fieldInputType,
  formatFieldLabel,
  groupPlaceholderFields,
} from "@/lib/website/field-groups";
import { cn } from "@/lib/utils";

function FieldEditor({
  field,
  value,
  onSaved,
}: {
  field: string;
  value: string;
  onSaved: (field: string, value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputType = fieldInputType(field);
  const isTextarea = inputType === "textarea";

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const save = useCallback(
    async (next: string, action: "edit" | "regenerate" = "edit") => {
      if (action === "edit") setSaving(true);
      else setRegenerating(true);
      try {
        const res = await fetch("/api/website/placeholder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value: next, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setLocal(data.value ?? next);
        onSaved(field, data.value ?? next);
        if (action === "regenerate") toast.success("Regenerated with AI");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
        setRegenerating(false);
      }
    },
    [field, onSaved]
  );

  function scheduleSave(next: string) {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 800);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={field} className="text-xs text-muted-foreground">
          {formatFieldLabel(field)}
        </Label>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[10px] text-muted-foreground">Saving…</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gold"
            disabled={regenerating || saving}
            onClick={() => save(local, "regenerate")}
          >
            <Sparkles className="mr-1 size-3" />
            {regenerating ? "…" : "AI"}
          </Button>
        </div>
      </div>
      {isTextarea ? (
        <textarea
          id={field}
          value={local}
          rows={4}
          onChange={(e) => scheduleSave(e.target.value)}
          className={cn(
            "flex w-full rounded-sm border border-[hsl(var(--input))] bg-[hsl(var(--surface-form))] px-3.5 py-2 text-sm",
            "focus-visible:outline-none focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.25)]"
          )}
        />
      ) : (
        <Input
          id={field}
          type={inputType}
          value={local}
          onChange={(e) => scheduleSave(e.target.value)}
        />
      )}
    </div>
  );
}

export function ContentPanel({
  filledPlaceholders,
  onChange,
}: {
  filledPlaceholders: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  const keys = Object.keys(filledPlaceholders).filter(
    (k) => k !== "active_theme"
  );
  const groups = groupPlaceholderFields(keys);

  if (keys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Content fields will appear here once your site is generated.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">{group.label}</h3>
          <div className="space-y-4">
            {group.fields.map((field) => (
              <FieldEditor
                key={field}
                field={field}
                value={filledPlaceholders[field] ?? ""}
                onSaved={onChange}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
