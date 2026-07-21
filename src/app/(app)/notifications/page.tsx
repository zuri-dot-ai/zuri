import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { Bell } from "lucide-react";
import { marketingUrl } from "@/lib/marketing-url";
import { NotificationsListClient } from "@/components/app/notifications-list-client";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("notifications")
    .select("id, title, body, action_url, created_at, is_read")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-6 page-enter">
      <header className="page-head flex items-center justify-between">
        <div>
          <h1>Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates about your website, content, and account.
          </p>
        </div>
      </header>

      {!items?.length ? (
        <EmptyState
          variant="notifications"
          icon={Bell}
          title="No notifications yet"
          description="When your site gets submissions, content is ready, or milestones hit, they'll show up here."
          actionLabel="Go to Home"
          actionHref="/dashboard"
          actionVariant="secondary"
        />
      ) : (
        <NotificationsListClient initialItems={items} />
      )}

      <p className="text-center text-xs text-muted-foreground">
        Prefer email digests? Adjust preferences in{" "}
        <Link href="/settings?tab=notifications" className="text-gold hover:underline">
          Settings
        </Link>
        . Need a human?{" "}
        <a
          href={marketingUrl("/contact.html")}
          className="text-gold hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Contact support
        </a>
        .
      </p>
    </div>
  );
}
