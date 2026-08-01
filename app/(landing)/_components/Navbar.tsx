"use client";

import { useScrollTop } from "@/hooks/useScrollTop";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

export const Navbar = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const scrolled = useScrollTop();

  return (
    <nav
      className={cn(
        "bg-background dark:bg-dark sticky inset-x-0 top-0 z-50 mx-auto flex w-full items-center p-6",
        scrolled && "border-b shadow-xs",
      )}
    >
      <Logo />
      <div className="flex w-full items-center justify-end md:ml-auto">
        <div className="flex items-center gap-x-2">
          {isLoading && <Spinner />}
          {!isLoading && !isAuthenticated && (
            <>
              <Button
                className="hidden md:block"
                variant="ghost"
                size="sm"
                asChild
              >
                <Link href="/sign-in">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/sign-up">Get Zotion Free</Link>
              </Button>
            </>
          )}

          {isAuthenticated && !isLoading && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents"> Enter Zotion </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Log out"
                onClick={() => authClient.signOut()}
              >
                <LogOut />
              </Button>
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
};
