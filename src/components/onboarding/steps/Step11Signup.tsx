"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { marketingUrl } from "@/lib/marketing-url";
import { authCallbackUrl } from "@/lib/auth/redirect";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

interface Step11SignupProps {
  sessionToken: string;
  firstName: string;
}

/**
 * Onboarding V2 Step 11 (docs/01_ONBOARDING_V2.md §6 "Signup Gateway") — the
 * only forced-auth moment in the entire flow. Everything already answered
 * (Steps 1-10) lives in the anonymous session row; signing up here just
 * attaches a real account to it. Google OAuth round-trips through
 * /api/auth/callback (which fires /api/onboarding/complete itself); direct
 * email+password signup fires it right here when a session comes back
 * immediately (email confirmation disabled).
 */
export function Step11Signup({ sessionToken, firstName }: Step11SignupProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function completeAndAdvance() {
    try {
      await safeFetchJSON("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof FetchError
          ? err.message
          : "Could not finish setup. Please try again."
      );
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (!termsAccepted) {
      return toast.error("Please agree to the Terms of Service and Privacy Policy.");
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
        data: { full_name: firstName, terms_accepted: true },
        emailRedirectTo: authCallbackUrl(window.location.origin, "/start"),
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
          terms_accepted_at: new Date().toISOString(),
          terms_version: "1.0",
        })
        .eq("id", data.user.id);
    }

    if (!data.session) {
      setLoading(false);
      toast.success("Account created! Check your inbox to verify your email, then sign in.");
      router.push("/login");
      return;
    }

    await completeAndAdvance();
  }

  async function handleGoogle() {
    if (!termsAccepted) {
      return toast.error("Please agree to the Terms of Service and Privacy Policy.");
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(window.location.origin, "/start"),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboarding-headline">Create your account, {firstName || "there"}</h1>
        <p className="onboarding-subtext">
          One step left — we&apos;ll start building your site the moment you sign up.
        </p>
      </div>

      <div className="onboarding-panel space-y-5">
        <button type="button" className="btn-ghost w-full" onClick={handleGoogle}>
          <GoogleIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-[var(--chrome-dark)]">
          <span className="h-px flex-1 bg-[#222]" /> or{" "}
          <span className="h-px flex-1 bg-[#222]" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup_email" className="field-label">Email</Label>
            <Input
              id="signup_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@business.com"
              autoComplete="email"
              className="onboarding-input h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup_password" className="field-label">Password</Label>
            <PasswordInput
              id="signup_password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="onboarding-input h-11"
            />
            <PasswordChecklist password={password} />
          </div>

          <label
            htmlFor="signup_terms"
            className="flex items-start gap-3 rounded-sm p-3 -mx-3 transition-colors hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <input
              type="checkbox"
              id="signup_terms"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-6 w-6 shrink-0 accent-[#d4a656]"
            />
            <span className="text-sm text-[var(--chrome-mid)]">
              I agree to Zuri&apos;s{" "}
              <a
                href={marketingUrl("/terms.html")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gold underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={marketingUrl("/privacy.html")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gold underline"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account & build my site"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[var(--chrome-mid)]">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-gold hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
