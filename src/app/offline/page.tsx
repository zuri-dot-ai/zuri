import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo size="navbar" href="/" />
      <h1 className="mt-10 font-heading text-2xl font-medium">You&apos;re offline</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Zuri can&apos;t reach the network right now. Check your connection and
        try again.
      </p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">Retry</Link>
      </Button>
    </div>
  );
}
