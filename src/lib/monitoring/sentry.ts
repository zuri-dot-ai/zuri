/**
 * Thin monitoring wrapper around @sentry/nextjs.
 *
 * Every `generateSupportRef()` call site should pair with `captureError()` so a
 * support ref reported by a user or judge is instantly traceable in the
 * monitoring dashboard, instead of something you have to grep server logs for.
 *
 * Safe to call with or without a DSN configured:
 * - No `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` set → no-ops on the network side,
 *   still logs the same structured payload to the console (so local dev and
 *   competition judging both work without a Sentry account).
 * - DSN set → also forwards to Sentry via `Sentry.captureException`.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
);

export interface CaptureErrorContext {
  /** Support reference shown to the user — the join key between UI and logs. */
  supportRef?: string;
  userId?: string | null;
  route?: string;
  /** Free-form context, e.g. ErrorBoundary section name or extra request info. */
  context?: string;
  extra?: Record<string, unknown>;
}

/**
 * Structured log format per docs/11_ERROR_HANDLING.md section 15.1:
 * `[CONTEXT] [SEVERITY] Message` + structured metadata.
 */
export function captureError(
  error: unknown,
  ctx: CaptureErrorContext = {}
): void {
  const { supportRef, userId, route, context, extra } = ctx;

  const payload = {
    userId: userId ?? undefined,
    supportRef,
    route,
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...extra,
  };

  console.error(
    `[${context ?? route ?? "app"}] [error]${supportRef ? ` [${supportRef}]` : ""} Unhandled error`,
    payload
  );

  if (!SENTRY_ENABLED) return;

  try {
    Sentry.captureException(error, (scope) => {
      if (supportRef) scope.setTag("support_ref", supportRef);
      if (route) scope.setTag("route", route);
      if (context) scope.setTag("context", context);
      if (userId) scope.setUser({ id: userId });
      if (extra) scope.setContext("extra", extra);
      return scope;
    });
  } catch (sentryErr) {
    // Monitoring must never itself crash the request/render path.
    console.error("[monitoring] Sentry.captureException failed:", sentryErr);
  }
}

/** Convenience helper for non-error warnings worth surfacing (e.g. degraded fallback used). */
export function captureMessage(
  message: string,
  ctx: CaptureErrorContext = {}
): void {
  console.warn(`[${ctx.context ?? ctx.route ?? "app"}] [warning] ${message}`, ctx);
  if (!SENTRY_ENABLED) return;
  try {
    Sentry.captureMessage(message, "warning");
  } catch {
    // ignore
  }
}
