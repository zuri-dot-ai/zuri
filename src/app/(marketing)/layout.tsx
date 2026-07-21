import Link from "next/link";
import { Logo } from "@/components/ui/logo";

/**
 * Minimal public shell for logged-out-accessible pages served from the app
 * domain (agency directory, profiles, application form). No auth required.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Logo variant="wordmark" size="sm" href="/" />
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/agencies"
              className="text-muted-foreground hover:text-foreground"
            >
              Agencies
            </Link>
            <Link
              href="/login"
              className="font-medium text-gold hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zuri. Built for Africa.
      </footer>
    </div>
  );
}
