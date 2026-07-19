"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  BarChart3,
  CalendarCheck,
  Globe,
  Home,
  PenLine,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ElementType;
  keywords?: string[];
};

const COMMANDS: CommandItem[] = [
  { id: "home", label: "Home", href: "/dashboard", icon: Home, keywords: ["dashboard"] },
  { id: "website", label: "Website", href: "/website", icon: Globe },
  {
    id: "publish",
    label: "Publish website",
    href: "/website",
    icon: Upload,
    hint: "Open website editor",
    keywords: ["publish", "go live"],
  },
  { id: "content", label: "Content", href: "/content", icon: PenLine },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { id: "plan", label: "Plan", href: "/plan", icon: CalendarCheck, keywords: ["90 day"] },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

/**
 * Cmd/Ctrl+K command palette — jump to key routes / actions.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.includes(q)) ||
        c.hint?.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const run = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        run(filtered[active]);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, active, run]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/55"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-[rgba(201,162,39,0.28)] bg-[var(--bg-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-gold" strokeWidth={1.75} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to… or search actions"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => run(item)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      i === active
                        ? "bg-gold/10 text-foreground"
                        : "text-muted-foreground hover:bg-[var(--bg-secondary)] hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-gold" strokeWidth={1.75} />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.hint && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {item.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t border-border px-4 py-2 text-[10px] text-[var(--text-tertiary)]">
          <span className="hidden sm:inline">↑↓ navigate · ↵ open · </span>
          <kbd className="rounded border border-border px-1">⌘</kbd>/
          <kbd className="rounded border border-border px-1">Ctrl</kbd>+
          <kbd className="rounded border border-border px-1">K</kbd>
        </div>
      </div>
    </div>,
    document.body
  );
}
