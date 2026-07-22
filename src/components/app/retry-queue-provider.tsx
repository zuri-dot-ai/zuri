"use client";

import { useRetryQueue } from "@/hooks/use-retry-queue";

/**
 * Mounts the retry-on-reconnect queue at the app root. Renders nothing —
 * exists purely so the root layout (a server component) can opt a client
 * hook into the tree.
 */
export function RetryQueueProvider() {
  useRetryQueue();
  return null;
}
