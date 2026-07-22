"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { captureError } from "@/lib/monitoring/sentry";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** e.g. "website-builder", "content-calendar", "analytics" */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * An error in one part of the dashboard must never crash another part.
 * Wrap every major dashboard section in one of these, each tagged with its
 * own `context` so ErrorBoundary crashes are traceable per-section in the
 * monitoring dashboard.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, {
      context: `ErrorBoundary:${this.props.context ?? "unknown"}`,
      extra: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="mb-4 size-8 text-amber-400" />
          <h3 className="font-heading text-lg text-foreground mb-2">
            Something went wrong here
          </h3>
          <p className="mb-6 max-w-xs text-sm text-muted-foreground">
            This section ran into an unexpected problem. The rest of your
            dashboard is fine.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 text-sm text-gold"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap all major dashboard sections, e.g.:
// <ErrorBoundary context="website-builder">...</ErrorBoundary>
// <ErrorBoundary context="content-calendar">...</ErrorBoundary>
// <ErrorBoundary context="analytics">...</ErrorBoundary>
