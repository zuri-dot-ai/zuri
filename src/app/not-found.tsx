import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { marketingUrl } from "@/lib/marketing-url";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo size="navbar" href={marketingUrl()} />
      <p
        className="mt-10 font-heading text-[clamp(5rem,15vw,9rem)] font-normal leading-none text-gold"
        aria-hidden
      >
        404
      </p>
      <h1 className="mt-4 font-heading text-2xl font-medium">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This route doesn&apos;t exist — or it moved. Head back to your workspace
        or the marketing site.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={marketingUrl()}>Marketing site</a>
        </Button>
      </div>
    </div>
  );
}
