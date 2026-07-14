export type ErrorSeverity = "critical" | "error" | "warning" | "info";

// critical: System is broken — admin must act now (payment processing down, DB unavailable)
// error: Feature is broken — user sees an error, developer should fix soon
// warning: Degraded experience — feature partially works, log but don't alert
// info: Expected failure — user hit a limit, rate limit, or validation error

export interface ZuriError {
  code: string; // Machine-readable: "GEMINI_TIMEOUT", "HANDLE_TAKEN"
  severity: ErrorSeverity;
  userMessage: string; // What the user sees — friendly, actionable
  developerMessage: string; // What goes in the log — full technical detail
  action?: string; // What the user should do: "upgrade", "retry", "contact_support"
  supportRef?: string; // Generated reference for 500 errors
}
