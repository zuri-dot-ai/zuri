"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { AdminTemplateRow } from "@/app/admin/templates/page";

type Props = {
  templates: AdminTemplateRow[];
  storageBaseUrl: string;
};

export function TemplatesAdminClient({ templates, storageBaseUrl }: Props) {
  const [rows, setRows] = useState(templates);
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [note, setNote] = useState(templates[0]?.revision_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, AdminTemplateRow[]>();
    for (const t of rows) {
      const list = map.get(t.archetype) ?? [];
      list.push(t);
      map.set(t.archetype, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const selected = rows.find((t) => t.id === selectedId) ?? null;
  const previewUrl = selected
    ? `${storageBaseUrl}/${selected.storage_path}`
    : null;

  function selectTemplate(t: AdminTemplateRow) {
    setSelectedId(t.id);
    setNote(t.revision_note ?? "");
    setMessage(null);
  }

  function flagRevision(needsRevision: boolean) {
    if (!selected) return;
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/templates/revision", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          needs_revision: needsRevision,
          revision_note: needsRevision ? note.trim() || null : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? "Failed to update revision flag");
        return;
      }
      setRows((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                needs_revision: needsRevision,
                revision_note: needsRevision ? note.trim() || null : null,
              }
            : t
        )
      );
      setMessage(
        needsRevision ? "Flagged needs_revision" : "Cleared revision flag"
      );
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="max-h-[80vh] space-y-6 overflow-y-auto border border-border bg-surface p-4">
        {grouped.map(([archetype, list]) => (
          <div key={archetype}>
            <h2 className="eyebrow mb-2">{archetype}</h2>
            <ul className="space-y-1">
              {list.map((t) => {
                const active = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectTemplate(t)}
                      className={`w-full px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border border-gold bg-muted text-foreground"
                          : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="block font-medium">{t.display_name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                        {t.mode} · {t.lean}
                        {t.needs_revision ? " · needs revision" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      <section className="min-w-0">
        {!selected ? (
          <p className="text-sm text-muted-foreground">No templates loaded.</p>
        ) : (
          <>
            <header className="page-head mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1>{selected.display_name}</h1>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {selected.id} · {selected.placeholder_fields?.length ?? 0}{" "}
                  placeholders · {selected.image_slots?.length ?? 0} image slots
                </p>
              </div>
              {selected.needs_revision && (
                <span className="border border-gold px-2 py-1 text-xs text-gold">
                  needs_revision
                </span>
              )}
            </header>

            <div className="overflow-hidden border border-border bg-black">
              {previewUrl ? (
                <iframe
                  key={selected.id}
                  title={`Preview ${selected.display_name}`}
                  src={previewUrl}
                  className="h-[62vh] w-full bg-white"
                />
              ) : null}
            </div>

            <div className="surface mt-6 p-4">
              <label
                htmlFor="revision-note"
                className="field-label block"
              >
                Revision note
              </label>
              <textarea
                id="revision-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What needs to change?"
                className="mt-2 w-full border border-[hsl(var(--input))] bg-[hsl(var(--surface-form))] px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => flagRevision(true)}
                >
                  {pending ? "Saving…" : "Flag needs_revision"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !selected.needs_revision}
                  onClick={() => flagRevision(false)}
                >
                  Clear flag
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={previewUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open HTML
                  </a>
                </Button>
              </div>
              {message && (
                <p className="mt-3 text-sm text-gold">{message}</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
