import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

/**
 * Minimal public shell for logged-out-accessible pages served from the app
 * domain (agency directory, profiles, application form). No auth required.
 * Uses the same shared `NavBar` as the in-app chrome so marketing pages
 * read as part of the same product, not a separate app.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <NavBar
        right={
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
        }
      />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zuri. Built for Africa.
      </footer>
    </div>
  );
}
