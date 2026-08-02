import { Button } from "@/components/ui/button";
import { NEXFIY_PRO_PLAN } from "@/features/billing/plan-content";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export const PricingPreview = () => {
  return (
    <section
      id="plan"
      className="border-border bg-muted/20 text-foreground border-y py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-8">
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-bold tracking-[0.18em] text-zinc-500 uppercase">
            Two plans
          </p>
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Start free. Go Pro when you need more.
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-600">
            Free for personal pages. Pro adds APIs, MCP, multiple workspaces,
            and team collaboration.
          </p>
        </div>

        <article className="border-border border-y py-8 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-2xl font-bold">{NEXFIY_PRO_PLAN.name}</h3>
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {NEXFIY_PRO_PLAN.trialLabel}
            </span>
          </div>
          <div className="mt-7 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight">
              {NEXFIY_PRO_PLAN.priceLabel}
            </span>
            <span className="text-muted-foreground mb-1 text-sm">
              {NEXFIY_PRO_PLAN.billingLabel}
            </span>
          </div>

          <ul className="mt-8 space-y-3">
            {NEXFIY_PRO_PLAN.features.slice(0, 3).map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button size="lg" className="mt-8 w-full" asChild>
            <Link href="/pricing">
              See pricing
              <ArrowRight />
            </Link>
          </Button>
        </article>
      </div>
    </section>
  );
};
