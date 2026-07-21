"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotifRow {
  id: string;
  title: string;
  body: string | null;
  action_url: string | null;
  created_at: string;
  is_read: boolean;
}

export function NotificationsListClient({ initialItems }: { initialItems: NotifRow[] }) {
  const [items, setItems] = useState(initialItems);
  const supabase = createClient();

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-[var(--bg-secondary)]">
      {items.map((n) => (
        <li key={n.id} className="group flex items-start">
          <Link
            href={n.action_url || "#"}
            onClick={() => !n.is_read && markRead(n.id)}
            className={`block flex-1 px-5 py-4 transition-colors hover:bg-muted ${
              !n.is_read ? "bg-[var(--bg-elevated)]/40" : ""
            }`}
          >
            <p className="break-words font-medium">{n.title}</p>
            {n.body && (
              <p className="mt-1 break-words text-sm text-muted-foreground">{n.body}</p>
            )}
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </Link>
          <button
            onClick={() => remove(n.id)}
            aria-label="Delete notification"
            className="mr-3 mt-4 rounded-sm p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
