"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { marketingUrl } from "@/lib/marketing-url";
import { authCallbackUrl } from "@/lib/auth/redirect";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { cn } from "@/lib/utils";

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

interface Step4SignupProps {
  sessionToken: string;
  onSignedIn: () => void;
  onValidityChange: (valid: boolean) => void;
}

/**
 * Signup gate for the custom-site funnel — answers stay in the anon session
 * until convert + submit. Shell Continue is hidden; actions live in this step.
 */
export function Step4Signup({
  sessionToken,
  onSignedIn,
  onValidityChange,
}: Step4SignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [termsFlash, setTermsFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onValidityChange(false);
  }, [onValidityChange]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  function promptTerms() {
    toast.error("Please agree to the Terms of Service and Privacy Policy.");
    setTermsFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setTermsFlash(false), 1400);
  }

  function requireTerms(): boolean {
    if (termsAccepted) return true;
    promptTerms();
    return false;
  }

  async function convertSession() {
    try {
      await safeFetchJSON("/api/custom-site/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
    } catch (err) {
      console.error("[custom-site signup] convert failed:", err);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!requireTerms()) return;
    if (!firstName.trim()) {
      return toast.error("Please enter your first name.");
    }
    if (!isStrongPassword(password)) {
      return toast.error(
        "Password must be at least 8 characters, with one uppercase letter and one number."
      );
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: firstName.trim(), terms_accepted: true },
        emailRedirectTo: authCallbackUrl(
          window.location.origin,
          "/custom-site"
        ),
      },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          full_name: firstName.trim(),
          terms_accepted_at: new Date().toISOString(),
          terms_version: "1.0",
        })
        .eq("id", data.user.id);
    }

    if (!data.session) {
      setLoading(false);
      toast.success(
        "Account created! Check your inbox to verify your email, then sign in to finish."
      );
      return;
    }

    await convertSession();
    setLoading(false);
    onSignedIn();
  }

  async function handleGoogle() {
    if (!requireTerms()) return;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(window.location.origin, "/custom-site"),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) toast.error(error.message);
  }

  function handleContinueWithEmail() {
    if (!requireTerms()) return;
    setShowEmailForm(true);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="onboarding-headline text-[1.5rem] sm:text-[2rem]">
          Create your account
        </h1>
        <p className="onboarding-subtext mt-1.5">
          Your answers are saved — sign up so we can submit your custom project
          request.
        </p>
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-sm border px-3 py-2.5 transition-colors",
          termsFlash
            ? "border-red-400/60 bg-red-400/5"
            : "border-border bg-[var(--bg-secondary)]"
        )}
      >
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--gold)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">
          I agree to the{" "}
          <a
            href={marketingUrl("/terms")}
            target="_blank"
            rel="noreferrer"
            className="text-gold underline-offset-2 hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href={marketingUrl("/privacy.html")}
            target="_blank"
            rel="noreferrer"
            className="text-gold underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {!showEmailForm ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogle}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-[var(--bg-secondary)] text-sm font-medium text-foreground transition hover:border-[var(--border-hover)]"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={handleContinueWithEmail}
            className="flex h-11 w-full items-center justify-center rounded-sm bg-gold text-sm font-medium text-[var(--bg-primary)] transition hover:opacity-90"
          >
            Continue with Email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cs-first-name">First name</Label>
            <Input
              id="cs-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="onboarding-input h-11"
              autoComplete="given-name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cs-email">Email</Label>
            <Input
              id="cs-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="onboarding-input h-11"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cs-password">Password</Label>
            <PasswordInput
              id="cs-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="onboarding-input h-11"
              autoComplete="new-password"
              required
            />
            <PasswordChecklist password={password} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-sm bg-gold text-sm font-medium text-[var(--bg-primary)] transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account & continue"}
          </button>
          {loading === false && (
            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="w-full text-center text-sm text-[var(--text-tertiary)] hover:text-foreground"
            >
              Back to options
            </button>
          )}
        </form>
      )}

    </div>
  );
}
