"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { createClient } from "@/lib/supabase/client";
import {
  POSTING_DAY_KEYS,
  serializeContentProfile,
  type ContentProfile,
  type PostingDayKey,
} from "@/lib/content/content-profile";
import type { ContentPillarRow } from "@/types/database";

const DAY_LABELS: Record<PostingDayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

const PILLAR_COLORS = [
  "#E2843A",
  "#C9A84C",
  "#D94F4F",
  "#4FA8D9",
  "#4DA86E",
  "#9B59B6",
];

export function PillarEditorPanel({
  pillars,
  contentProfile,
  onPillarsChange,
  onProfileChange,
  onClose,
}: {
  pillars: ContentPillarRow[];
  contentProfile: ContentProfile;
  onPillarsChange: (pillars: ContentPillarRow[]) => void;
  onProfileChange: (profile: ContentProfile) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [profile, setProfile] = useState(contentProfile);

  async function patchPillar(
    id: string,
    patch: Partial<ContentPillarRow>
  ) {
    setBusy(true);
    try {
      const { pillar } = await safeFetchJSON<{ pillar: ContentPillarRow }>(
        `/api/content/pillars/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      onPillarsChange(pillars.map((p) => (p.id === id ? pillar : p)));
      toast.success("Pillar updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update pillar");
    } finally {
      setBusy(false);
    }
  }

  async function movePillar(id: string, dir: -1 | 1) {
    const idx = pillars.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= pillars.length) return;
    const order = pillars.map((p) => p.id);
    const tmp = order[idx];
    order[idx] = order[next];
    order[next] = tmp;
    setBusy(true);
    try {
      const { pillars: updated } = await safeFetchJSON<{
        pillars: ContentPillarRow[];
      }>("/api/content/pillars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      onPillarsChange(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder");
    } finally {
      setBusy(false);
    }
  }

  async function addPillar() {
    const name = newName.trim();
    if (name.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setBusy(true);
    try {
      const { pillar } = await safeFetchJSON<{ pillar: ContentPillarRow }>(
        "/api/content/pillars",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            color: PILLAR_COLORS[pillars.length % PILLAR_COLORS.length],
          }),
        }
      );
      onPillarsChange([...pillars, pillar]);
      setNewName("");
      toast.success("Pillar added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add pillar");
    } finally {
      setBusy(false);
    }
  }

  async function deletePillar(id: string) {
    setBusy(true);
    try {
      await safeFetchJSON(`/api/content/pillars/${id}`, { method: "DELETE" });
      onPillarsChange(pillars.filter((p) => p.id !== id));
      toast.success("Pillar removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete pillar");
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule(next: ContentProfile) {
    setProfile(next);
    onProfileChange(next);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("business_profiles")
        .update({ content_profile: serializeContentProfile(next) })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Posting schedule saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save schedule");
    } finally {
      setBusy(false);
    }
  }

  function toggleDay(day: PostingDayKey) {
    const has = profile.posting_days.includes(day);
    const posting_days = has
      ? profile.posting_days.filter((d) => d !== day)
      : [...profile.posting_days, day];
    if (posting_days.length === 0) {
      toast.error("Keep at least one posting day");
      return;
    }
    void saveSchedule({ ...profile, posting_days });
  }

  function setDayPillar(day: PostingDayKey, pillarId: string) {
    const pillar_schedule = { ...profile.pillar_schedule };
    if (!pillarId) delete pillar_schedule[day];
    else pillar_schedule[day] = pillarId;
    void saveSchedule({ ...profile, pillar_schedule });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-[var(--bg-primary)] shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Content pillars</h2>
            <p className="text-xs text-muted-foreground">
              Rename, reorder, and set which days you post.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <ul className="space-y-3">
            {pillars.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  "rounded-md border border-border p-3",
                  !p.is_active && "opacity-60"
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-2 size-3 shrink-0 rounded-full"
                    style={{ background: p.color ?? "#C9A84C" }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={p.name}
                      disabled={busy}
                      onChange={(e) =>
                        onPillarsChange(
                          pillars.map((x) =>
                            x.id === p.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                      onBlur={(e) => {
                        if (e.target.value.trim() !== pillars.find((x) => x.id === p.id)?.name)
                          void patchPillar(p.id, { name: e.target.value.trim() });
                      }}
                    />
                    <Input
                      value={p.description ?? ""}
                      disabled={busy}
                      placeholder="Short description"
                      onChange={(e) =>
                        onPillarsChange(
                          pillars.map((x) =>
                            x.id === p.id
                              ? { ...x, description: e.target.value }
                              : x
                          )
                        )
                      }
                      onBlur={(e) =>
                        void patchPillar(p.id, { description: e.target.value })
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={p.is_active}
                          disabled={busy}
                          onChange={(e) =>
                            void patchPillar(p.id, { is_active: e.target.checked })
                          }
                        />
                        Active
                      </label>
                      <div className="ml-auto flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy || i === 0}
                          onClick={() => void movePillar(p.id, -1)}
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy || i === pillars.length - 1}
                          onClick={() => void movePillar(p.id, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy || pillars.length <= 1}
                          onClick={() => void deletePillar(p.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {pillars.length < 6 && (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New pillar name"
                disabled={busy}
              />
              <Button disabled={busy} onClick={() => void addPillar()}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          )}

          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <Label>Posting days</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Calendar generation prefers these weekdays.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {POSTING_DAY_KEYS.map((day) => {
                const on = profile.posting_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-[#C9A84C]/50 bg-[#C9A84C]/15 text-[var(--text-primary)]"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-2">
              <Label>Pillar per day (optional)</Label>
              {profile.posting_days.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-muted-foreground">
                    {DAY_LABELS[day]}
                  </span>
                  <Select
                    value={profile.pillar_schedule[day] ?? ""}
                    disabled={busy}
                    className="h-9 flex-1"
                    onChange={(e) => setDayPillar(day, e.target.value)}
                  >
                    <option value="">Rotate automatically</option>
                    {pillars
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
