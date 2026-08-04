"use client";

import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Link from "next/link";

export const Footer = () => {
  const { t } = useI18n();

  const footerLinks = [
    { href: "/documents", label: t("footer.workspace") },
    { href: "/pricing", label: t("footer.pricing") },
    { href: "/docs", label: t("footer.developers") },
    { href: "/blog", label: t("footer.blog") },
    { href: "/#faq", label: t("footer.faq") },
    { href: "/refund-policy", label: t("footer.refunds") },
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
  ];

  return (
    <footer className="border-t border-zinc-200 bg-white py-10 text-sm text-zinc-600 dark:border-white/10 dark:bg-[#191919] dark:text-white/65">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="space-y-2">
          <Logo />
          <p className="text-xs text-zinc-500 dark:text-white/45">
            {t("footer.copyright")}
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
          <span className="self-center">
            <LanguageToggle align="start" />
          </span>
        </nav>
      </div>
    </footer>
  );
};
