import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, encryptToken } from "./token-encryption";

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Google token refresh returned no access_token");
  }
  return data.access_token as string;
}

function calculateAvgPosition(
  rows: { position?: number; impressions?: number }[]
): number {
  if (!rows.length) return 0;
  const totalImpressions = rows.reduce(
    (acc, r) => acc + (r.impressions ?? 0),
    0
  );
  if (totalImpressions === 0) return 0;
  const weightedSum = rows.reduce(
    (acc, r) => acc + (r.position ?? 0) * (r.impressions ?? 0),
    0
  );
  return Math.round((weightedSum / totalImpressions) * 10) / 10;
}

export async function syncSearchConsoleData(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: connection } = await supabase
    .from("search_console_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!connection) return;

  let accessToken: string;
  try {
    accessToken = await refreshGoogleToken(
      decryptToken(connection.refresh_token_encrypted)
    );
  } catch (err) {
    console.error("GSC token refresh failed:", err);
    await supabase
      .from("search_console_connections")
      .update({ status: "expired" })
      .eq("user_id", userId);
    return;
  }

  const { data: website } = await supabase
    .from("websites")
    .select("handle, custom_domain")
    .eq("user_id", userId)
    .maybeSingle();

  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace(/^app\./, "") ||
    "buildzuri.com";
  const siteUrl = website?.custom_domain
    ? `https://${website.custom_domain}/`
    : `https://${website?.handle}.${rootDomain}/`;

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const queriesRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 20,
        dataState: "final",
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (queriesRes.status === 403) {
    await supabase
      .from("search_console_connections")
      .update({ status: "site_not_verified" })
      .eq("user_id", userId);
    return;
  }

  const queriesData = await queriesRes.json();

  const pagesRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 10,
        dataState: "final",
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const pagesData = await pagesRes.json();

  const queryRows = queriesData.rows ?? [];

  await supabase.from("search_console_snapshots").upsert(
    {
      user_id: userId,
      site_url: siteUrl,
      snapshot_date: new Date().toISOString().split("T")[0],
      top_queries: queryRows,
      top_pages: pagesData.rows ?? [],
      total_clicks: queryRows.reduce(
        (acc: number, r: { clicks?: number }) => acc + (r.clicks ?? 0),
        0
      ),
      total_impressions: queryRows.reduce(
        (acc: number, r: { impressions?: number }) =>
          acc + (r.impressions ?? 0),
        0
      ),
      avg_position: calculateAvgPosition(queryRows),
    },
    { onConflict: "user_id,snapshot_date" }
  );

  await supabase
    .from("search_console_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/** Store Google refresh token after OAuth callback. */
export async function storeSearchConsoleConnection(
  userId: string,
  refreshToken: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("search_console_connections").upsert(
    {
      user_id: userId,
      refresh_token_encrypted: encryptToken(refreshToken),
      status: "active",
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
