import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatusValue = "idle" | "saving" | "saved" | "error";

const SAVED_HOLD_MS = 1800;

/**
 * Standardizes the inline "Saving…" -> "Saved" -> idle pattern used for
 * auto-saving fields (replacing explicit Save-button-and-wait flows). Errors
 * still bubble up to the caller (e.g. to show a toast with the real message)
 * but the status also briefly reflects "error" before resetting to idle.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatusValue>("idle");
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (resetRef.current) clearTimeout(resetRef.current);
    setStatus("saving");
    try {
      const result = await fn();
      setStatus("saved");
      resetRef.current = setTimeout(() => setStatus("idle"), SAVED_HOLD_MS);
      return result;
    } catch (e) {
      setStatus("error");
      resetRef.current = setTimeout(() => setStatus("idle"), SAVED_HOLD_MS);
      throw e;
    }
  }, []);

  return { status, run };
}
