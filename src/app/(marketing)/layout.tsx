import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/partners", label: "Partners" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed nav */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="zuri-container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Build your presence</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="zuri-container flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
          <Logo showMark={false} href="/" />
          <p className="text-center text-xs text-muted-foreground md:text-left">
            Built for Africa's entrepreneurs. Powered by Gemini.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/signup" className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}