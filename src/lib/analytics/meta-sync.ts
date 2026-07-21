import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "./token-encryption";

export interface MetaInsight {
  platform: "facebook" | "instagram";
  metric_name: string;
  metric_value: number;
  period_date: string;
}

export async function fetchMetaAccounts(accessToken: string): Promise<{
  pages: { id: string; name: string; access_token?: string }[];
  instagramAccount: { id: string; username: string } | null;
}> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
    { signal: AbortSignal.timeout(15000) }
  );
  const pagesData = await pagesRes.json();
  const pages = (pagesData.data ?? []) as {
    id: string;
    name: string;
    access_token?: string;
  }[];

  let instagramAccount: { id: string; username: string } | null = null;
  if (pages[0]?.id) {
    const pageToken = pages[0].access_token ?? accessToken;
    const igRes = await fetch(
      `https://graph.facebook.com/v18.0/${pages[0].id}?fields=instagram_business_account{id,username}&access_token=${pageToken}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const igData = await igRes.json();
    if (igData.instagram_business_account) {
      instagramAccount = {
        id: igData.instagram_business_account.id,
        username: igData.instagram_business_account.username,
      };
    }
  }

  return { pages, instagramAccount };
}

export async function fetchFacebookPageInsights(
  pageId: string,
  token: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  const metrics = [
    "page_impressions",
    "page_reach",
    "page_fans",
    "page_views_total",
    "page_post_engagements",
  ];

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/insights?` +
      new URLSearchParams({
        metric: metrics.join(","),
        period: "day",
        since,
        until,
        access_token: token,
      }),
    { signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).flatMap(
    (metric: { name: string; values?: { value: number; end_time?: string }[] }) =>
      (metric.values ?? []).map((v) => ({
        platform: "facebook" as const,
        metric_name: metric.name,
        metric_value: Number(v.value) || 0,
        period_date:
          v.end_time?.split("T")[0] ?? new Date().toISOString().split("T")[0],
      }))
  );
}

export async function fetchInstagramInsights(
  igUserId: string,
  token: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  const metrics = [
    "impressions",
    "reach",
    "follower_count",
    "profile_views",
    "website_clicks",
  ];

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/insights?` +
      new URLSearchParams({
        metric: metrics.join(","),
        period: "day",
        since,
        until,
        access_token: token,
      }),
    { signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).flatMap(
    (metric: { name: string; values?: { value: number; end_time?: string }[] }) =>
      (metric.values ?? []).map((v) => ({
        platform: "instagram" as const,
        metric_name: metric.name,
        metric_value: Number(v.value) || 0,
        period_date:
          v.end_time?.split("T")[0] ?? new Date().toISOString().split("T")[0],
      }))
  );
}

export async function syncMetaInsights(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!connection) return;

  const expiresAt = new Date(connection.token_expires_at);
  const daysUntilExpiry =
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry < 0) {
    await supabase
      .from("meta_connections")
      .update({ status: "expired" })
      .eq("user_id", userId);
    console.warn(`Meta token expired for user ${userId}`);
    return;
  }

  const token = decryptToken(connection.access_token_encrypted);
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const insights: MetaInsight[] = [];

  if (connection.facebook_page_id) {
    try {
      const pageInsights = await fetchFacebookPageInsights(
        connection.facebook_page_id,
        token,
        startDate,
        endDate
      );
      insights.push(...pageInsights);
    } catch (err) {
      console.error("Facebook page insights fetch failed:", err);
    }
  }

  if (connection.instagram_account_id) {
    try {
      const igInsights = await fetchInstagramInsights(
        connection.instagram_account_id,
        token,
        startDate,
        endDate
      );
      insights.push(...igInsights);
    } catch (err) {
      console.error("Instagram insights fetch failed:", err);
    }
  }

  if (insights.length > 0) {
    await supabase.from("meta_insights").upsert(
      insights.map((i) => ({ ...i, user_id: userId })),
      { onConflict: "user_id,platform,metric_name,period_date" }
    );
  }

  await supabase
    .from("meta_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
}
