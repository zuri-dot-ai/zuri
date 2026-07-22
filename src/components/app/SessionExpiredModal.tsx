"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

interface Props {
  open: boolean;
  /** Called after a successful re-auth — resumes exactly where the user was. */
  onResume: () => void;
  /** Called if the user dismisses instead of re-authenticating (read-only continue). */
  onDismiss: () => void;
}

/**
 * Shown in place instead of a hard redirect when the session expires
 * mid-use. Draft state has already been saved to localStorage by the caller
 * (see `use-session-monitor`) before this renders, so re-auth here can
 * resume exactly where the user was.
 */
export function SessionExpiredModal({ open, onResume, onDismiss }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleReauth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      return;
    }

    toast.success("Signed back in — resuming where you left off.");
    onResume();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="surface w-full max-w-sm p-7">
        <h2
          id="session-expired-title"
          className="font-heading text-xl font-medium text-foreground"
        >
          Your session has expired
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in again to continue — your unsaved changes were saved as a
          draft and will be restored.
        </p>

        <form onSubmit={handleReauth} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-reauth-email" className="field-label">
              Email
            </Label>
            <Input
              id="session-reauth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@business.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-reauth-password" className="field-label">
              Password
            </Label>
            <PasswordInput
              id="session-reauth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in and resume"}
          </Button>
        </form>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Continue in read-only mode
        </button>
      </div>
    </div>
  );
}
