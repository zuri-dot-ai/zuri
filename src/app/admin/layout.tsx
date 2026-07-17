import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/admin/category-images")}`);
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <Logo size="navbar" href="/dashboard" />
            <div>
              <p className="eyebrow">Internal</p>
              <p className="font-heading text-lg font-medium">Zuri Admin</p>
            </div>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/admin/category-images" className="hover:text-gold">
              Category images
            </Link>
            <Link href="/admin/templates" className="hover:text-gold">
              Templates
            </Link>
            <Link href="/dashboard" className="hover:text-gold">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
