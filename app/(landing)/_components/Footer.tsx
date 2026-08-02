import { Logo } from "@/components/logo";
import Link from "next/link";

const footerLinks = [
  { href: "/documents", label: "Workspace" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Developers" },
  { href: "/#faq", label: "FAQ" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const Footer = () => {
  return (
    <footer className="border-t border-zinc-200 bg-white py-10 text-sm text-zinc-600 dark:border-white/10 dark:bg-[#191919] dark:text-white/65">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="space-y-2">
          <Logo />
          <p className="text-xs text-zinc-500 dark:text-white/45">
            © 2026 Nexfiy Labs, Inc.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium transition-colors hover:text-zinc-900 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};
