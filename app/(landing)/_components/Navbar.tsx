"use client";

import { useScrollTop } from "@/hooks/useScrollTop";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
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

const NAV_LINKS = [
  { label: "Why Nexfiy", href: "/#why-nexfiy" },
  { label: "Compare", href: "/#compare" },
  { label: "FAQ", href: "/#faq" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Docs", href: "/docs" },
];

export const Navbar = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const scrolled = useScrollTop();

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
            {NAV_LINKS.map((link) => (
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
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-lg border-0 bg-[#2383e2] px-3.5 font-medium text-white shadow-xs hover:bg-[#1d6fc2]"
                asChild
              >
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          )}
          <ModeToggle />

          {isAuthenticated && !isLoading && (
            <Button
              size="sm"
              className="rounded-lg bg-[#2383e2] font-medium text-white hover:bg-[#1d6fc2]"
              asChild
            >
              <Link href="/documents">Enter Nexfiy</Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {NAV_LINKS.map((link) => (
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
                      Log in
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="w-full">
                      See pricing
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
