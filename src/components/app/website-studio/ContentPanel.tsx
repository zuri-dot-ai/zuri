"use client";

import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveStatus } from "@/hooks/use-save-status";
import {
  fieldInputType,
  formatFieldLabel,
  groupIntoItemCards,
  groupPlaceholderFields,
} from "@/lib/website/field-groups";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";

function SaveCheckButton({
  dirty,
  status,
  disabled,
  onSave,
}: {
  dirty: boolean;
  status: "idle" | "saving" | "saved" | "error";
  disabled?: boolean;
  onSave: () => void;
}) {
  const saving = status === "saving";
  const saved = status === "saved";
  const error = status === "error";
  const canSave = dirty && !saving && !disabled;

  return (
    <button
      type="button"
      title={
        saving
          ? "Saving…"
          : saved
            ? "Saved"
            : error
              ? "Couldn't save — try again"
              : dirty
                ? "Save"
                : "No changes"
      }
      aria-label={
        saving
          ? "Saving"
          : saved
            ? "Saved"
            : error
              ? "Save failed"
              : dirty
                ? "Save field"
                : "No changes to save"
      }
      disabled={!canSave && !error}
      onMouseDown={(e) => {
        // Prevent input blur before click so we don't double-save
        if (canSave || error) e.preventDefault();
      }}
      onClick={() => {
        if (canSave || error) onSave();
      }}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-sm border [transition-duration:var(--transition-fast)] transition-colors",
        saved && "border-success/40 bg-success/10 text-success",
        error && "border-error/40 bg-error/10 text-error",
        !saved &&
          !error &&
          canSave &&
          "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20",
        !saved &&
          !error &&
          !canSave &&
          "border-[var(--border-solid)] bg-[var(--bg-secondary)] text-muted-foreground opacity-50",
        canSave && "cursor-pointer",
        !canSave && !error && "cursor-default"
      )}
    >
      {saving ? (
        <span className="zuri-spinner !size-3.5" />
      ) : (
        <Check className="size-4" strokeWidth={2.5} />
      )}
    </button>
  );
}

function FieldEditor({
  field,
  value,
  onSaved,
  onFocusField,
  onNeedsReview,
  canSave = true,
}: {
  field: string;
  value: string;
  onSaved: (field: string, value: string) => void;
  onFocusField?: (field: string) => void;
  onNeedsReview?: (needsReview: boolean) => void;
  canSave?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [regenerating, setRegenerating] = useState(false);
  const { status: saveStatus, run: runSave } = useSaveStatus();
  const inputType = fieldInputType(field);
  const isTextarea = inputType === "textarea";
  const dirty = local !== value;
  const saving = saveStatus === "saving";

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const save = useCallback(
    async (next: string, action: "edit" | "regenerate" = "edit") => {
      if (!canSave) {
        toast.error(
          "This website is missing its template binding. Regenerate your site or contact support."
        );
        return;
      }
      if (action === "edit" && next === value) return;
      if (action === "regenerate") setRegenerating(true);
      try {
        const data = await (action === "edit"
          ? runSave(() =>
              safeFetchJSON<{ value?: string; needsReview?: boolean }>(
                "/api/website/placeholder",
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ field, value: next, action }),
                }
              )
            )
          : safeFetchJSON<{ value?: string; needsReview?: boolean }>(
              "/api/website/placeholder",
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field, value: next, action }),
              }
            ));
        setLocal(data.value ?? next);
        onSaved(field, data.value ?? next);
        if (typeof data.needsReview === "boolean") {
          onNeedsReview?.(data.needsReview);
        }
        if (action === "regenerate") toast.success("Regenerated with AI");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setRegenerating(false);
      }
    },
    [canSave, field, onSaved, onNeedsReview, runSave, value]
  );

  function handleBlur() {
    if (!canSave) return;
    if (dirty && !saving) void save(local);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!canSave) return;
      if (dirty && !saving) void save(local);
    }
  }

  const checkButton = (
    <SaveCheckButton
      dirty={dirty}
      status={saveStatus}
      disabled={regenerating || !canSave}
      onSave={() => void save(local)}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={field}>{formatFieldLabel(field)}</Label>
        <div className="flex items-center gap-2">
          {isTextarea && checkButton}
          {isTextarea && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gold"
              disabled={regenerating || saving || !canSave}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => save(local, "regenerate")}
            >
              {regenerating ? (
                <span className="zuri-spinner mr-1 !size-3" />
              ) : (
                <Sparkles className="mr-1 size-3" />
              )}
              AI
            </Button>
          )}
        </div>
      </div>
      {isTextarea ? (
        <textarea
          id={field}
          value={local}
          rows={4}
          disabled={!canSave}
          onFocus={() => onFocusField?.(field)}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex w-full rounded-sm border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3.5 py-2 text-sm [transition-duration:var(--transition-fast)] transition-colors",
            "focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20",
            !canSave && "opacity-60"
          )}
        />
      ) : (
        <div className="flex items-center gap-2">
          <Input
            id={field}
            type={inputType}
            value={local}
            disabled={!canSave}
            onFocus={() => onFocusField?.(field)}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1"
          />
          {checkButton}
        </div>
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
  canSave = true,
}: {
  groupId: string;
  fields: string[];
  filledPlaceholders: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onFocusField?: (field: string) => void;
  onNeedsReview?: (needsReview: boolean) => void;
  canSave?: boolean;
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
            canSave={canSave}
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
                canSave={canSave}
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
  canSave = true,
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
  /** False when website has no template_id — blocks PATCH storms. */
  canSave?: boolean;
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

  const missingTemplateBanner = !canSave ? (
    <p className="rounded-sm border border-[var(--border-solid)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-muted-foreground">
      This site is missing a template reference, so content edits can’t be
      saved. Regenerate your website or contact support.
    </p>
  ) : null;

  if (singleGroupId) {
    const group = groups.find((g) => g.id === singleGroupId) ?? {
      id: singleGroupId,
      label: singleGroupId,
      fields: keys,
    };
    return (
      <div className="space-y-4">
        {missingTemplateBanner}
        <ItemCards
          groupId={group.id}
          fields={group.fields}
          filledPlaceholders={filledPlaceholders}
          onChange={onChange}
          onFocusField={onFocusField}
          onNeedsReview={onNeedsReview}
          canSave={canSave}
        />
      </div>
    );
  }

  if (accordion) {
    return (
      <div className="space-y-2">
        {missingTemplateBanner}
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
                    canSave={canSave}
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
      {missingTemplateBanner}
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
            canSave={canSave}
          />
        </section>
      ))}
    </div>
  );
}
