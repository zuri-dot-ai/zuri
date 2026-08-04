"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CornerCardNotification,
  QueueableNotification,
} from "./types";

const SESSION_INTERRUPTION_KEY = "zuri-session-interruption-shown";

function hasUsedSessionInterruption(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(SESSION_INTERRUPTION_KEY) === "1";
}

function markSessionInterruptionUsed() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_INTERRUPTION_KEY, "1");
}

interface NotificationQueueState {
  /** The single active modal or coachmark, if any. */
  activeInterruption: QueueableNotification | null;
  /** The single active corner card, if any. */
  activeCornerCard: CornerCardNotification | null;
  /** Register a notification candidate. The queue decides if/when it shows. */
  enqueue: (item: QueueableNotification) => void;
  /** Dismiss whatever is currently occupying the interruption slot. */
  dismissActiveInterruption: () => void;
  /** Dismiss the active corner card. */
  dismissActiveCornerCard: () => void;
}

const NotificationQueueContext = createContext<NotificationQueueState | null>(
  null
);

export function NotificationQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [interruptionQueue, setInterruptionQueue] = useState<
    QueueableNotification[]
  >([]);
  const [cornerCardQueue, setCornerCardQueue] = useState<
    CornerCardNotification[]
  >([]);
  const sessionLockRef = useRef(hasUsedSessionInterruption());

  const enqueue = useCallback((item: QueueableNotification) => {
    if (item.surface === "corner-card") {
      setCornerCardQueue((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [...prev, item].sort((a, b) => a.priority - b.priority);
      });
      return;
    }

    // Modal / coachmark — subject to the one-interruption-per-session rule.
    setInterruptionQueue((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item].sort((a, b) => a.priority - b.priority);
    });
  }, []);

  const activeInterruption = useMemo(() => {
    if (sessionLockRef.current) return null;
    return interruptionQueue[0] ?? null;
  }, [interruptionQueue]);

  const activeCornerCard = useMemo(
    () => cornerCardQueue[0] ?? null,
    [cornerCardQueue]
  );

  const dismissActiveInterruption = useCallback(() => {
    setInterruptionQueue((prev) => {
      const [current, ...rest] = prev;
      current?.onDismiss?.();
      return rest;
    });
    markSessionInterruptionUsed();
    sessionLockRef.current = true;
  }, []);

  const dismissActiveCornerCard = useCallback(() => {
    setCornerCardQueue((prev) => {
      const [current, ...rest] = prev;
      current?.onDismiss?.();
      return rest;
    });
  }, []);

  const value = useMemo(
    () => ({
      activeInterruption,
      activeCornerCard,
      enqueue,
      dismissActiveInterruption,
      dismissActiveCornerCard,
    }),
    [
      activeInterruption,
      activeCornerCard,
      enqueue,
      dismissActiveInterruption,
      dismissActiveCornerCard,
    ]
  );

  return (
    <NotificationQueueContext.Provider value={value}>
      {children}
    </NotificationQueueContext.Provider>
  );
}

export function useNotificationQueue() {
  const ctx = useContext(NotificationQueueContext);
  if (!ctx) {
    throw new Error(
      "useNotificationQueue must be used within a NotificationQueueProvider"
    );
  }
  return ctx;
}