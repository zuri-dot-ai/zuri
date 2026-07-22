"use client";

import { useCallback, useState } from "react";
import { isOnline } from "@/lib/network/network-status";
import { enqueueRetry } from "@/hooks/use-retry-queue";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export interface ApiCallOptions extends RequestInit {
  /**
   * If true (default), a request that fails because of a network problem
   * (not a validation/auth/4xx response) is queued and automatically
   * retried once the connection comes back — see `use-retry-queue`.
   */
  retryOnReconnect?: boolean;
}

/**
 * Generic API call hook with error classification: distinguishes offline
 * failures, non-2xx responses (validation/auth/rate-limit/plan gate), and
 * unexpected client-side exceptions, always surfacing a friendly message.
 */
export function useApiCall<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const call = useCallback(
    async (
      url: string,
      options?: ApiCallOptions,
      onSuccess?: (data: T) => void
    ): Promise<T | null> => {
      const { retryOnReconnect = true, ...init } = options ?? {};
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json", ...init.headers },
          ...init,
        });

        let data: Record<string, unknown> = {};
        try {
          data = await res.json();
        } catch {
          // Non-JSON body — fall through to status-based handling.
        }

        if (!res.ok) {
          const errorMessage =
            (data.error as string | undefined) ??
            (data.message as string | undefined) ??
            "Something went wrong. Please try again.";
          setState({ data: null, error: errorMessage, isLoading: false });
          return null;
        }

        setState({ data: data as T, error: null, isLoading: false });
        onSuccess?.(data as T);
        return data as T;
      } catch (err) {
        const offline = !isOnline();
        const errorMessage = offline
          ? "You appear to be offline. Check your connection and try again."
          : "Something went wrong. Please try again.";

        setState({ data: null, error: errorMessage, isLoading: false });
        console.error("API call failed:", err);

        // Only queue for retry when the failure was network-related — never
        // for requests that never left the client for another reason.
        if (offline && retryOnReconnect) {
          enqueueRetry({ url, options: init });
        }

        return null;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return { ...state, call, clearError };
}
