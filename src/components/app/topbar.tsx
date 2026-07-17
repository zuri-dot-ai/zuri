"use client";

import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTheme } from "@/components/theme-provider";
import { Logo } from "@/components/ui/logo";

export function Topbar({ businessName }: { businessName?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (user?.full_name || user?.email || "Z").charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="md:hidden">
          <Logo showMark href="/dashboard" size="sm" />
        </span>
        {businessName && (
          <span className="hidden text-sm text-muted-foreground md:inline">
            {businessName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-none p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="size-5" strokeWidth={1.75} />
          ) : (
            <Moon className="size-5" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          className="rounded-none p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={signOut}
          className="rounded-none p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="size-5" strokeWidth={1.75} />
        </button>
        <div className="ml-1 flex size-9 items-center justify-center rounded-none bg-gold font-semibold text-[var(--black)]">
          {initial}
        </div>
      </div>
    </header>
  );
}
