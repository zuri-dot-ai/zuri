import { AlertCircle } from "lucide-react";

/** Field-level error display for forms. Renders nothing when message is empty/null. */
export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mt-1.5 flex items-start gap-2 text-sm text-error"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Usage in forms:
// <InlineError message={errors.businessName} />
