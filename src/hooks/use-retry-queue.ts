"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { onNetworkRestore } from "@/lib/network/network-status";

const STORAGE_KEY = "zuri:retry-queue";

interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  queuedAt: number;
}

function readQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  if (typeof window === "undefined") return;
  try {
    // RequestInit.body must be a plain string to survive JSON serialization —
    // callers should pass JSON.stringify'd bodies, which is the norm in this app.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // sessionStorage full/unavailable — queue still works in-memory this tab session.
  }
}

/**
 * Queue a request that failed specifically because of a network problem
 * (offline / fetch failed) — never call this for validation, auth, rate
 * limit, or plan-gate failures, since retrying those would just fail again
 * identically.
 */
export function enqueueRetry(req: { url: string; options?: RequestInit }) {
  if (typeof req.options?.body !== "undefined" && typeof req.options.body !== "string") {
    // Only string bodies (the JSON.stringify convention used across the app)
    // can be safely persisted and replayed.
    return;
  }
  const queue = readQueue();
  queue.push({
    id: crypto.randomUUID(),
    url: req.url,
    options: req.options ?? {},
    queuedAt: Date.now(),
  });
  writeQueue(queue);
}

async function replayQueue() {
  const queue = readQueue();
  if (queue.length === 0) return;

  writeQueue([]); // Clear immediately — in-flight retries own their own copy now.

  let successCount = 0;
  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        headers: { "Content-Type": "application/json", ...item.options.headers },
        ...item.options,
      });
      if (res.ok) {
        successCount++;
      } else {
        // Failed again for a non-network reason (e.g. now returns 401/403) —
        // don't re-queue, surface nothing further here; the original caller
        // already showed an error toast when it first failed.
        console.warn(`[retry-queue] Retry of ${item.url} came back non-OK:`, res.status);
      }
    } catch (err) {
      // Still can't reach the network — re-queue for the next reconnect.
      console.warn(`[retry-queue] Retry of ${item.url} failed again:`, err);
      enqueueRetry({ url: item.url, options: item.options });
    }
  }

  if (successCount > 0) {
    toast.success("Reconnected — your changes were saved.");
  }
}

/**
 * Mount once near the app root (alongside `<OfflineBanner />`). Listens for
 * the browser reporting the connection restored and replays any requests
 * that failed while offline.
 */
export function useRetryQueue() {
  useEffect(() => {
    return onNetworkRestore(() => {
      void replayQueue();
    });
  }, []);
}
