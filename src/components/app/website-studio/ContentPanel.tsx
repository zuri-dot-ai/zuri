"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fieldInputType,
  formatFieldLabel,
  groupIntoItemCards,
  groupPlaceholderFields,
} from "@/lib/website/field-groups";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";

function FieldEditor({
  field,
  value,
  onSaved,
  onFocusField,
  onNeedsReview,
}: {
  field: string;
  value: string;
  onSaved: (field: string, value: string) => void;
  onFocusField?: (field: string) => void;
  onNeedsReview?: (needsReview: boolean) => void;
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
        const data = await safeFetchJSON<{
          value?: string;
          needsReview?: boolean;
        }>("/api/website/placeholder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value: next, action }),
        });
        setLocal(data.value ?? next);
        onSaved(field, data.value ?? next);
        if (typeof data.needsReview === "boolean") {
          onNeedsReview?.(data.needsReview);
        }
        if (action === "regenerate") toast.success("Regenerated with AI");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
        setRegenerating(false);
      }
    },
    [field, onSaved, onNeedsReview]
  );

  function scheduleSave(next: string) {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 400);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={field}>{formatFieldLabel(field)}</Label>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-label">Saving…</span>
          )}
          {isTextarea && (
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
          )}
        </div>
      </div>
      {isTextarea ? (
        <textarea
          id={field}
          value={local}
          rows={4}
          onFocus={() => onFocusField?.(field)}
          onChange={(e) => scheduleSave(e.target.value)}
          className={cn(
            "flex w-full rounded-sm border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3.5 py-2 text-sm [transition-duration:var(--transition-fast)] transition-colors",
            "focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20"
          )}
        />
      ) : (
        <Input
          id={field}
          type={inputType}
          value={local}
          onFocus={() => onFocusField?.(field)}
          onChange={(e) => scheduleSave(e.target.value)}
        />
      )}
    </div>
  );
}

function ItemCards({
  groupId,
  fields,
  filledPlaceholders,
  onChange,
  onFocusField,
  onNeedsReview,
}: {
  groupId: string;
  fields: string[];
  filledPlaceholders: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onFocusField?: (field: string) => void;
  onNeedsReview?: (needsReview: boolean) => void;
}) {
  const cards = groupIntoItemCards(groupId, fields);
  const [expandedOptional, setExpandedOptional] = useState<Set<string>>(
    () => new Set()
  );

  if (!cards) {
    return (
      <div className="space-y-4">
        {fields.map((field) => (
          <FieldEditor
            key={field}
            field={field}
            value={filledPlaceholders[field] ?? ""}
            onSaved={onChange}
            onFocusField={onFocusField}
            onNeedsReview={onNeedsReview}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => {
        const hasFilled = card.fields.some((f) =>
          filledPlaceholders[f]?.trim()
        );
        const show =
          !card.optional || hasFilled || expandedOptional.has(card.id);

        if (!show) {
          return (
            <button
              key={card.id}
              type="button"
              onClick={() =>
                setExpandedOptional((s) => new Set(s).add(card.id))
              }
              className="flex w-full items-center gap-2 rounded-sm border border-dashed border-[var(--border-solid)] px-3 py-2.5 text-left text-xs text-muted-foreground [transition-duration:var(--transition-fast)] transition-colors hover:border-[var(--border-hover)] hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Optional — add {card.label.toLowerCase()}
            </button>
          );
        }

        return (
          <div key={card.id} className="content-card space-y-3 p-3">
            <p className="text-card-title">{card.label}</p>
            {card.fields.map((field) => (
              <FieldEditor
                key={field}
                field={field}
                value={filledPlaceholders[field] ?? ""}
                onSaved={onChange}
                onFocusField={onFocusField}
                onNeedsReview={onNeedsReview}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function ContentPanel({
  filledPlaceholders,
  onChange,
  onFocusField,
  onNeedsReview,
  focusFieldId,
  expandedGroupId,
  onExpandGroup,
  accordion = false,
  /** When set, render only this group's fields without a section heading. */
  singleGroupId,
}: {
  filledPlaceholders: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onFocusField?: (field: string) => void;
  onNeedsReview?: (needsReview: boolean) => void;
  focusFieldId?: string | null;
  expandedGroupId?: string | null;
  onExpandGroup?: (id: string) => void;
  accordion?: boolean;
  singleGroupId?: string;
}) {
  const keys = Object.keys(filledPlaceholders).filter(
    (k) => k !== "active_theme"
  );
  const groups = groupPlaceholderFields(keys);

  useEffect(() => {
    if (!focusFieldId) return;
    const el = document.getElementById(focusFieldId);
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusFieldId]);

  if (keys.length === 0) {
    return (
      <p className="text-card-body">
        Content fields will appear here once your site is generated.
      </p>
    );
  }

  if (singleGroupId) {
    const group = groups.find((g) => g.id === singleGroupId) ?? {
      id: singleGroupId,
      label: singleGroupId,
      fields: keys,
    };
    return (
      <ItemCards
        groupId={group.id}
        fields={group.fields}
        filledPlaceholders={filledPlaceholders}
        onChange={onChange}
        onFocusField={onFocusField}
        onNeedsReview={onNeedsReview}
      />
    );
  }

  if (accordion) {
    return (
      <div className="space-y-2">
        {groups.map((group) => {
          const open = expandedGroupId === group.id;
          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-sm border border-[var(--border-solid)]"
            >
              <button
                type="button"
                onClick={() => onExpandGroup?.(open ? "" : group.id)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium [transition-duration:var(--transition-fast)] transition-colors",
                  open ? "bg-surface text-gold" : "hover:bg-surface/60"
                )}
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              {open && (
                <div className="border-t border-[var(--border-solid)] p-3">
                  <ItemCards
                    groupId={group.id}
                    fields={group.fields}
                    filledPlaceholders={filledPlaceholders}
                    onChange={onChange}
                    onFocusField={onFocusField}
                    onNeedsReview={onNeedsReview}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="space-y-4">
          <h3 className="text-section-header">{group.label}</h3>
          <ItemCards
            groupId={group.id}
            fields={group.fields}
            filledPlaceholders={filledPlaceholders}
            onChange={onChange}
            onFocusField={onFocusField}
            onNeedsReview={onNeedsReview}
          />
        </section>
      ))}
    </div>
  );
}
