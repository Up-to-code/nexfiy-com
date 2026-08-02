"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProUpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="border-border border-y py-8">
      <p className="text-sm font-semibold">{feature} is included with Pro.</p>
      <p className="text-muted-foreground mt-1 max-w-lg text-sm leading-6">
        Start a seven-day trial to use databases, APIs, MCP, multiple
        workspaces, and team collaboration.
      </p>
      <Button className="mt-5" size="sm" asChild>
        <Link href="/pricing">
          View Pro
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
