"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Logo } from "@/components/ui/logo";

export function Topbar({ businessName }: { businessName?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (user?.full_name || user?.email || "Z").charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="md:hidden">
          <Logo showMark href="/dashboard" />
        </span>
        {businessName && (
          <span className="hidden text-sm text-muted-foreground md:inline">
            {businessName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
          <Bell className="size-5" />
        </button>
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="size-5" />
        </button>
        <div className="flex size-9 items-center justify-center rounded-full bg-gold font-semibold text-background">
          {initial}
        </div>
      </div>
    </header>
  );
}