"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flame, Trophy, Clock, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/app/stat-card";
import { BADGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActionPlanTaskRow, UserProgressRow, CompleteTaskResult } from "@/types/database";

export function PlanView({
  tasks: initialTasks,
  progress,
}: {
  tasks: ActionPlanTaskRow[];
  progress: UserProgressRow | null;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [openWeek, setOpenWeek] = useState<number | null>(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const streak = progress?.current_streak ?? 0;
  const completed = tasks.filter((t) => t.is_completed).length;
  const earnedBadges = progress?.badges_earned ?? [];

  // Group tasks into 13 weeks
  const weeks: Record<number, ActionPlanTaskRow[]> = {};
  tasks.forEach((t) => {
    const w = Math.ceil(t.day_number / 7);
    (weeks[w] ??= []).push(t);
  });

  async function toggle(task: ActionPlanTaskRow) {
    if (task.is_completed) return;
    setBusyId(task.id);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = (await res.json()) as CompleteTaskResult;
      if (!res.ok) throw new Error();
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: true } : t))
      );
      data.new_badges?.forEach((b) => {
        const badge = BADGES[b];
        if (badge) toast(`${badge.emoji} Badge earned: ${badge.label}`);
      });
    } catch {
      toast.error("Could not update task.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="page-head">
        <h1>Your 90-Day Plan</h1>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current streak" value={`${streak} 🔥`} icon={Flame} accent />
        <StatCard label="Tasks done" value={`${completed} / 90`} icon={CheckCircle2} />
        <StatCard label="Longest streak" value={progress?.longest_streak ?? 0} icon={Trophy} />
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="zuri-card">
          <p className="mb-4 text-sm font-medium">Badges earned</p>
          <div className="flex flex-wrap gap-3">
            {earnedBadges.map((b) => {
              const badge = BADGES[b];
              if (!badge) return null;
              return (
                <div key={b} className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2">
                  <span className="text-xl">{badge.emoji}</span>
                  <span className="text-sm font-medium">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly accordion */}
      <div className="space-y-3">
        {Object.entries(weeks).map(([weekStr, weekTasks]) => {
          const week = Number(weekStr);
          const isOpen = openWeek === week;
          const weekDone = weekTasks.filter((t) => t.is_completed).length;
          return (
            <div key={week} className="zuri-card overflow-hidden p-0">
              <button
                onClick={() => setOpenWeek(isOpen ? null : week)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg font-semibold">Week {week}</span>
                  <Badge variant={weekDone === weekTasks.length ? "success" : "muted"}>
                    {weekDone}/{weekTasks.length}
                  </Badge>
                </div>
                <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {weekTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-4 p-5">
                      <button
                        onClick={() => toggle(task)}
                        disabled={busyId === task.id || task.is_completed}
                        className="mt-0.5 shrink-0"
                      >
                        {busyId === task.id ? (
                          <span className="zuri-spinner" />
                        ) : task.is_completed ? (
                          <CheckCircle2 className="size-5 text-success" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground transition-colors hover:text-gold" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">Day {task.day_number}</span>
                          {task.platform && <Badge variant="outline">{task.platform}</Badge>}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" /> {task.estimated_minutes}m
                          </span>
                        </div>
                        <p className={cn("mt-1 font-medium", task.is_completed && "text-muted-foreground line-through")}>
                          {task.task_title}
                        </p>
                        {task.task_description && (
                          <p className="mt-1 text-sm text-muted-foreground">{task.task_description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
