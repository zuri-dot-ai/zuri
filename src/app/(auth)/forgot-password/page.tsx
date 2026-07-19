"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { authCallbackUrl } from "@/lib/auth/redirect";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(
        window.location.origin,
        "/settings?tab=profile"
      ),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Check your inbox for a reset link.");
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      headline={
        <>
          We&apos;ll email you
          <br />
          <em className="italic text-gold">a secure reset link.</em>
        </>
      }
      tagline="Enter the email on your Zuri account and we&apos;ll send instructions."
    >
      <div className="surface box-border w-full max-w-full p-7 sm:p-8">
        <div className="mb-6 md:hidden">
          <h1 className="font-heading text-3xl font-medium">Reset password</h1>
        </div>

        {sent ? (
          <div className="space-y-4 text-sm text-[var(--chrome-mid)]">
            <p>
              If an account exists for <strong className="text-foreground">{email}</strong>,
              you&apos;ll receive a reset link shortly.
            </p>
            <Link href="/login" className="btn-gold w-full">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="field-label">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@business.com"
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-sm text-[var(--chrome-mid)]">
          <Link href="/login" className="font-medium text-gold hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
