import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatusValue } from "@/hooks/use-save-status";

/**
 * Inline save-status indicator — renders nothing when idle, "Saving…" while
 * in flight, and a brief "Saved" confirmation on success. Pairs with
 * useSaveStatus() to replace explicit Save-button-and-wait flows.
 */
export function SaveStatus({
  status,
  className,
}: {
  status: SaveStatusValue;
  className?: string;
}) {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1 [transition-duration:var(--transition-fast)] transition-opacity",
        status === "saved" && "text-success",
        status === "error" && "text-error",
        className
      )}
    >
      {status === "saving" && (
        <>
          <span className="zuri-spinner !size-3" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3" /> Saved
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="size-3" /> Couldn&apos;t save
        </>
      )}
    </span>
  );
}
