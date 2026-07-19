import Link from "next/link";
import { HelpCircle, Mail, BookOpen, MessageCircle } from "lucide-react";
import { marketingUrl } from "@/lib/marketing-url";

const LINKS = [
  {
    href: marketingUrl("/faq.html"),
    external: true,
    icon: BookOpen,
    title: "FAQ",
    description: "Common questions about plans, publishing, and content.",
  },
  {
    href: marketingUrl("/contact.html"),
    external: true,
    icon: Mail,
    title: "Contact support",
    description: "Reach the Zuri team — we usually reply within one business day.",
  },
  {
    href: "/settings?tab=billing",
    external: false,
    icon: MessageCircle,
    title: "Billing & plans",
    description: "Upgrade, invoices, and plan limits.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 page-enter">
      <header className="page-head">
        <h1>Help & Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick links to get unstuck — without leaving your workspace longer than needed.
        </p>
      </header>

      <div className="grid gap-3">
        {LINKS.map(({ href, external, icon: Icon, title, description }) => {
          const className =
            "surface flex items-start gap-4 border border-border p-5 transition-shadow hover:shadow-[var(--elevation-2)]";
          const body = (
            <>
              <div className="flex size-10 items-center justify-center border border-border bg-muted text-gold">
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </>
          );
          return external ? (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {body}
            </a>
          ) : (
            <Link key={title} href={href} className={className}>
              {body}
            </Link>
          );
        })}
      </div>

      <div className="empty-state py-12 text-center">
        <HelpCircle className="mx-auto size-8 text-[var(--text-secondary)]" strokeWidth={1.75} />
        <h3 className="mt-4 text-h2 font-semibold tracking-[-0.015em]">Still stuck?</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Email{" "}
          <a href="mailto:hello@buildzuri.com" className="text-gold hover:underline">
            hello@buildzuri.com
          </a>{" "}
          with your handle and we&apos;ll dig in.
        </p>
      </div>
    </div>
  );
}
