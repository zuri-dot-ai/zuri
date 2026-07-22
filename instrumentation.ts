// Next.js instrumentation hook — loads the right Sentry config per runtime.
// No-ops safely when no DSN is configured (see sentry.*.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string }
) {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request as never, context as never);
}
