"use client";

import { Button } from "@/components/ui/button";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const CtaSection = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <section className="border-border/40 bg-background text-foreground border-t py-24 text-center">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-6xl">
          Build the workspace you wish your tools could read.
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg leading-relaxed">
          Nexfiy is in early access. Start with a personal workspace or review
          the team plan before inviting collaborators.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {!isAuthenticated && !isLoading && (
            <Button
              size="lg"
              className="h-11 w-full rounded-xl bg-[#2383e2] px-8 text-base font-medium text-white shadow-xs hover:bg-[#1d6fc2] sm:w-auto"
              asChild
            >
              <Link href="/pricing">See pricing</Link>
            </Button>
          )}

          {isAuthenticated && !isLoading && (
            <Button
              size="lg"
              className="h-11 rounded-xl bg-[#2383e2] px-8 text-base font-medium text-white shadow-xs hover:bg-[#1d6fc2]"
              asChild
            >
              <Link href="/documents">
                Enter Nexfiy
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
