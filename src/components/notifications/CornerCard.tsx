"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationQueue } from "@/lib/notifications/notification-queue";

const VARIANT_STYLES = {
  info: {
    icon: Info,
    accent: "var(--accent)",
    border: "rgba(201, 168, 76, 0.25)",
  },
  warning: {
    icon: AlertTriangle,
    accent: "#e2a83a",
    border: "rgba(226, 168, 58, 0.3)",
  },
  error: {
    icon: XCircle,
    accent: "#c0392b",
    border: "rgba(192, 57, 43, 0.3)",
  },
} as const;

/**
 * Renders the single active corner card from the notification queue, if any.
 * Mount this once near the root of the (app) layout — it manages its own
 * visibility based on queue state, replacing GracePeriodBanner / TrialEndingBanner.
 */
export function CornerCardHost() {
  const { activeCornerCard, dismissActiveCornerCard } = useNotificationQueue();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 w-full max-w-sm">
      <AnimatePresence>
        {activeCornerCard && (
          <motion.div
            key={activeCornerCard.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="pointer-events-auto"
          >
            <CornerCardBody
              variant={activeCornerCard.variant}
              title={activeCornerCard.title}
              body={activeCornerCard.body}
              actionLabel={activeCornerCard.actionLabel}
              onAction={activeCornerCard.onAction}
              onDismiss={dismissActiveCornerCard}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CornerCardBody({
  variant,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  variant: "info" | "warning" | "error";
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}) {
  const { icon: Icon, accent, border } = VARIANT_STYLES[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] border p-4 shadow-lg backdrop-blur-md"
      )}
      style={{
        background: "rgba(28, 25, 21, 0.92)", // var(--bg-elevated) w/ alpha
        borderColor: border,
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="mt-0.5 size-4 shrink-0"
          style={{ color: accent }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            {body}
          </p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 text-sm font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: accent }}
            >
              {actionLabel}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-[var(--text-tertiary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
