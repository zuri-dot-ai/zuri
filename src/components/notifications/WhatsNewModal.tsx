"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { PremiumModal } from "./PremiumModal";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  /** Optional small tag e.g. "New", "Improved", "Fixed" */
  tag?: string;
  /** Optional image/gif URL shown above the entry copy */
  media_url?: string | null;
}

interface WhatsNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ChangelogEntry[];
  latestVersion: string;
  userId: string;
  onDismissed?: () => void;
}

/**
 * The flagship "premium moment" modal — shown once per version per user.
 * Dismissal is written to Supabase (see schema in
 * supabase/migrations/xxxx_changelog.sql) so it's synced across devices.
 */
export function WhatsNewModal({
  open,
  onOpenChange,
  entries,
  latestVersion,
  userId,
  onDismissed,
}: WhatsNewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open]);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const supabase = createClient();
      await supabase.from("user_changelog_dismissals").upsert(
        {
          user_id: userId,
          last_seen_version: latestVersion,
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      // Fail silently on write — worst case the modal reappears next
      // session, which is a much better failure mode than blocking the UI.
      console.error("Failed to persist changelog dismissal:", err);
    } finally {
      setDismissing(false);
      onDismissed?.();
      onOpenChange(false);
    }
  }

  const entry = entries[activeIndex];
  const isLastEntry = activeIndex === entries.length - 1;

  if (!entry) return null;

  return (
    <PremiumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) void handleDismiss();
        else onOpenChange(next);
      }}
      hideCloseButton
      size="md"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pb-1 pt-7">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5" style={{ color: "var(--accent)" }} />
            <span
              className="text-xs font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--accent)" }}
            >
              What&apos;s New
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleDismiss()}
            className="text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Skip
          </button>
        </div>

        {/* Media (optional) */}
        {entry.media_url && (
          <div className="mx-7 mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-solid)]">
            <img
              src={entry.media_url}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        )}

        {/* Content — animated per-entry so navigating feels alive */}
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="px-7 pb-2 pt-6"
        >
          {entry.tag && (
            <span
              className="mb-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
              style={{
                background: "rgba(201, 168, 76, 0.12)",
                color: "var(--accent)",
                border: "1px solid rgba(201, 168, 76, 0.24)",
              }}
            >
              {entry.tag}
            </span>
          )}
          <h2 className="font-heading text-2xl leading-tight text-[var(--text-primary)]">
            {entry.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {entry.description}
          </p>
        </motion.div>

        {/* Footer: progress dots + nav */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--border-solid)] px-7 py-5">
          <div className="flex items-center gap-1.5">
            {entries.map((e, i) => (
              <button
                key={e.id}
                type="button"
                aria-label={`Go to update ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activeIndex ? "w-5" : "w-1.5 opacity-40"
                )}
                style={{
                  background: "var(--accent)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={dismissing}
            onClick={() => {
              if (isLastEntry) {
                void handleDismiss();
              } else {
                setActiveIndex((i) => i + 1);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium",
              "transition-transform duration-150 active:scale-[0.98]",
              "disabled:opacity-60"
            )}
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            {isLastEntry ? "Got it" : "Next"}
            {!isLastEntry && <ArrowRight className="size-3.5" />}
          </button>
        </div>
      </div>
    </PremiumModal>
  );
}
