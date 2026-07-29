import { createClient } from "@/lib/supabase/server";
import { ContentCalendar } from "@/components/app/content-calendar";
import { getActivePlanId } from "@/lib/payments/get-plan";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import {
  isContentProfileComplete,
  parseContentProfile,
} from "@/lib/content/content-profile";
import type { ContentCalendarRow, ContentPillarRow } from "@/types/database";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: slots }, { data: pillars }, { data: brand }, planId] =
    await Promise.all([
      supabase
        .from("content_calendar")
        .select("*, content_pillars(id, name, color, icon)")
        .eq("user_id", user!.id)
        .gte("scheduled_date", start)
        .lte("scheduled_date", end)
        .order("scheduled_date"),
      supabase
        .from("content_pillars")
        .select("*")
        .eq("user_id", user!.id)
        .order("sort_order"),
      supabase
        .from("business_profiles")
        .select(
          "content_profile, brand_tone, target_audience, services"
        )
        .eq("user_id", user!.id)
        .maybeSingle(),
      getActivePlanId(supabase, user!.id),
    ]);

  const contentProfile = parseContentProfile(brand?.content_profile, {
    brand_tone: brand?.brand_tone,
    target_audience: brand?.target_audience,
    services: brand?.services,
  });

  return (
    <ErrorBoundary context="content-calendar">
      <ContentCalendar
        initialSlots={(slots as ContentCalendarRow[]) ?? []}
        pillars={(pillars as ContentPillarRow[]) ?? []}
        plan={planId}
        initialMonth={month}
        initialYear={year}
        contentProfileComplete={isContentProfileComplete(contentProfile)}
        initialContentProfile={contentProfile}
      />
    </ErrorBoundary>
  );
}
