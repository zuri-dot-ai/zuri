import Link from "next/link";
import { Globe, PenLine, Flame, Sparkles, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/app/stat-card";
import { TodayTaskCard } from "@/components/app/today-task-card";
import { ZuriParticleCanvas } from "@/components/ui/zuri-particle-canvas";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: account },
    { data: profile },
    { data: progress },
    { data: website },
  ] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user!.id).single(),
    supabase.from("business_profiles").select("business_name").eq("user_id", user!.id).maybeSingle(),
    supabase.from("user_progress").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("websites").select("is_published, published_slug").eq("user_id", user!.id).maybeSingle(),
  ]);

  // Find today's first incomplete task
  const today = new Date().toISOString().split("T")[0];
  const { data: todayTasks } = await supabase
    .from("action_plan_tasks")
    .select("*")
    .eq("user_id", user!.id)
    .lte("due_date", today)
    .eq("is_completed", false)
    .order("day_number", { ascending: true })
    .limit(1);

  const { count: readyContent } = await supabase
    .from("content_calendar")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("status", "drafted");

  const firstName = account?.full_name?.split(" ")[0] || "there";
  const streak = progress?.current_streak ?? 0;
  const weekRate = Math.round(progress?.week_completion_rate ?? 0);
  const todayTask = todayTasks?.[0];

  return (
    <div className="relative mx-auto max-w-5xl space-y-8 pb-8">
      <ZuriParticleCanvas count={8} opacity={0.03} />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            {greeting()}, <span className="text-gradient-gold">{firstName}</span>.
          </h1>
          {profile?.business_name && (
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              {profile.business_name}
            </p>
          )}
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2">
            <span className="relative flex items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/30" />
              <Flame className="relative size-5 text-gold" />
            </span>
            <span className="font-mono text-lg font-semibold">{streak}</span>
            <span className="text-sm text-muted-foreground">day streak</span>
          </div>
        )}
      </header>

      <TodayTaskCard task={todayTask ?? null} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/website" className="block">
          <div className="glass-card flex items-center justify-between transition-all duration-200 hover:-translate-y-[2px] hover:border-gold/20 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Website</p>
              <p className="mt-1 font-heading text-2xl font-semibold">
                {website?.is_published ? "Live" : "Draft"}
              </p>
              {website?.published_slug && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {website.published_slug}.zuri.app
                </p>
              )}
            </div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <Globe className="size-5" strokeWidth={1.75} />
            </div>
          </div>
        </Link>

        <Link href="/content" className="block">
          <div className="glass-card flex items-center justify-between transition-all duration-200 hover:-translate-y-[2px] hover:border-gold/20 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Content</p>
              <p className="mt-1 font-heading text-2xl font-semibold">
                {readyContent ?? 0}{" "}
                <span className="text-base font-normal text-muted-foreground">ready</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">drafts waiting for you</p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <PenLine className="size-5" strokeWidth={1.75} />
            </div>
          </div>
        </Link>

        <StatCard
          label="Streak"
          value={streak + " " + (streak === 1 ? "day" : "days")}
          icon={Flame}
          accent
        />
      </div>

      <section className="glass-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">This week's progress</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {weekRate >= 100
                ? "Goal complete. Beautiful work."
                : `${100 - weekRate}% to your weekly goal`}
            </p>
          </div>
          <span className="font-mono text-base text-gold">{weekRate}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, weekRate))}%`,
              background:
                "linear-gradient(90deg, #C9A84C 0%, #E2BC5A 60%, #C9A84C 100%)",
              boxShadow: "0 0 12px rgba(201,168,76,0.45)",
              transition: "width 600ms cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
          />
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Quick actions
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            asChild
            variant="outline"
            className="group h-12 justify-start gap-3 border-white/10 bg-white/[0.02] px-5 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.04]"
          >
            <Link href="/content">
              <Sparkles className="size-4 text-gold" strokeWidth={1.75} />
              Generate content
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="group h-12 justify-start gap-3 border-white/10 bg-white/[0.02] px-5 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.04]"
          >
            <Link href="/website">
              <Globe className="size-4 text-gold" strokeWidth={1.75} />
              Edit website
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="group h-12 justify-start gap-3 border-white/10 bg-white/[0.02] px-5 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.04]"
          >
            <Link href="/plan">
              <CalendarCheck className="size-4 text-gold" strokeWidth={1.75} />
              View plan
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}