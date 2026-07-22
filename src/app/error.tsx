"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { captureError } from "@/lib/monitoring/sentry";
import { generateSupportRef } from "@/lib/errors/support-ref";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const supportRef = useMemo(() => generateSupportRef(), []);

  useEffect(() => {
    captureError(error, {
      context: "route-error",
      supportRef,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error, supportRef]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo size="navbar" href="/dashboard" />
      <h1 className="mt-10 font-heading text-2xl font-medium">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. This has been logged and we&apos;ll
        look into it. If it keeps happening, contact support with reference:{" "}
        <span className="font-mono text-foreground">{supportRef}</span>
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
