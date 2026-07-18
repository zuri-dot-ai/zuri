import { createBrowserClient } from "@supabase/ssr";

/** Browser/React components only — anon key. Never use service role here. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in Vercel → Settings → Environment Variables."
    );
  }

  return createBrowserClient(url, key);
}
