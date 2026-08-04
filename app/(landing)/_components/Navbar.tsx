"use client";

import { useScrollTop } from "@/hooks/useScrollTop";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/spinner";
import { Menu } from "lucide-react";
import Link from "next/link";

export const Navbar = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { t } = useI18n();
  const scrolled = useScrollTop();

  const navLinks = [
    { label: t("nav.whyNexfiy"), href: "/#why-nexfiy" },
    { label: t("nav.compare"), href: "/#compare" },
    { label: t("nav.faq"), href: "/#faq" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.blog"), href: "/blog" },
    { label: t("nav.docs"), href: "/docs" },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 w-full border-b border-transparent bg-white/90 text-zinc-900 backdrop-blur-md transition-all duration-200 dark:bg-[#191919]/90 dark:text-white",
        scrolled &&
          "border-zinc-200/80 bg-white/95 shadow-xs dark:border-white/10 dark:bg-[#191919]/95",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-8">
          <Logo />
          <div className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex dark:text-white/65">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-zinc-900 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-x-2.5">
          {isLoading && <Spinner />}
          {!isLoading && !isAuthenticated && (
            <div className="hidden items-center gap-x-2.5 sm:flex">
              <Button
                variant="ghost"
                size="sm"
                className="font-medium text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10"
                asChild
              >
                <Link href="/sign-in">{t("common.logIn")}</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-lg border-0 bg-[#2383e2] px-3.5 font-medium text-white shadow-xs hover:bg-[#1d6fc2]"
                asChild
              >
                <Link href="/pricing">{t("common.seePricing")}</Link>
              </Button>
            </div>
          )}
          <ThemeToggle />
          <LanguageToggle />

          {isAuthenticated && !isLoading && (
            <Button
              size="sm"
              className="rounded-lg bg-[#2383e2] font-medium text-white hover:bg-[#1d6fc2]"
              asChild
            >
              <Link href="/documents">{t("common.enterNexfiy")}</Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href} className="w-full">
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {!isLoading && !isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/sign-in" className="w-full">
                      {t("common.logIn")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="w-full">
                      {t("common.seePricing")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
