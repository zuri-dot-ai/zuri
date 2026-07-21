import { createClient } from "@/lib/supabase/server";
import { CampaignPreviewClient } from "./CampaignPreviewClient";

export default async function ContentPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ slots?: string }>;
}) {
  const params = await searchParams;
  const slotIds = (params.slots ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || slotIds.length === 0) {
    return <CampaignPreviewClient initialSlots={[]} />;
  }

  const { data: slots } = await supabase
    .from("content_calendar")
    .select(
      "id, platform, format_type, topic, hook, brief, scheduled_date, content_id, status"
    )
    .eq("user_id", user.id)
    .in("id", slotIds);

  // Preserve selection order
  const byId = new Map((slots ?? []).map((s) => [s.id, s]));
  const ordered = slotIds
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return <CampaignPreviewClient initialSlots={ordered} />;
}
