"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { marketingUrl } from "@/lib/marketing-url";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function persistTermsAccepted(userId: string) {
    await supabase
      .from("profiles")
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: "1.0",
      })
      .eq("id", userId);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (!termsAccepted) {
      return toast.error("Please agree to the Terms of Service and Privacy Policy.");
    }

    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          terms_accepted: true,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (data.user) {
      await persistTermsAccepted(data.user.id);
    }

    setLoading(false);

    // Email confirmation enabled — no session until verified
    if (!data.session) {
      toast.success(
        "Account created! Check your inbox to verify your email, then sign in."
      );
      router.push("/login");
      return;
    }

    toast.success("Account created! Let’s build your presence.");
    router.push("/onboarding");
    router.refresh();
  }

  async function handleGoogle() {
    if (!termsAccepted) {
      return toast.error("Please agree to the Terms of Service and Privacy Policy.");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
      },
    });
    if (error) toast.error(error.message);
  }

  return (
    <AuthShell
      eyebrow="Start your presence"
      headline={
        <>
          The operating system
          <br />
          <em className="italic text-gold">for modern businesses.</em>
        </>
      }
      tagline="Launch your business online with Zuri. Instantly create a premium website, unlock a personalized 90-day content plan, and accelerate growth with AI."
      socialProof="Join African entrepreneurs building lasting online presence"
    >
      <div className="surface box-border w-full max-w-full p-7 sm:p-8">
        <div className="mb-6 md:hidden">
          <h1 className="font-heading text-3xl font-medium">
            The operating system for modern businesses.
          </h1>
          <p className="mt-1 text-sm text-[var(--chrome-mid)]">
            Launch your business online with Zuri.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
        >
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-[var(--chrome-dark)]">
          <span className="h-px flex-1 bg-[#222]" /> or{" "}
          <span className="h-px flex-1 bg-[#222]" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="field-label">
              Full name
            </Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Ada Obi"
              autoComplete="name"
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password" className="field-label">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-[var(--chrome-dark)]">
              At least 8 characters, with one uppercase letter and one number.
            </p>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              id="terms_consent"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 accent-[#d4a656]"
            />
            <label
              htmlFor="terms_consent"
              className="text-sm text-[var(--chrome-mid)]"
            >
              I agree to Zuri&apos;s{" "}
              <a
                href={marketingUrl("/terms.html")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={marketingUrl("/privacy.html")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline"
              >
                Privacy Policy
              </a>
              . I understand that my data will be processed as described.
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-[var(--chrome-mid)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
