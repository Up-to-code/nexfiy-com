import { Button } from "@/components/ui/button";
import { NexfiyProCheckout } from "@/features/billing/NexfiyProCheckout";
import { NEXFIY_PRO_PLAN } from "@/features/billing/plan-content";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Footer } from "../(landing)/_components/Footer";
import { Navbar } from "../(landing)/_components/Navbar";

const freeFeatures = [
  "Create and edit pages",
  "Use text, media, links, and embeds",
  "Organize a personal workspace",
] as const;

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-32 pb-24">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
              Pricing
            </p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-7xl">
              Start free. Go Pro when you need more.
            </h1>
          </header>

          <div className="border-border mt-14 grid border-y lg:grid-cols-2">
            <article className="border-border flex flex-col py-10 sm:px-8 lg:border-r lg:px-10 lg:py-12">
              <p className="text-muted-foreground font-mono text-xs">01</p>
              <div className="mt-8 flex items-end justify-between gap-4">
                <h2 className="text-2xl font-bold">Free</h2>
                <p className="text-4xl font-bold">$0</p>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                For personal pages.
              </p>
              <ul className="border-border mt-8 space-y-3 border-t pt-7 text-sm">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#2383e2]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="mt-9 w-full rounded-xl sm:w-fit"
                asChild
              >
                <Link href="/documents">
                  Start free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </article>

            <article className="flex flex-col py-10 sm:px-8 lg:px-10 lg:py-12">
              <p className="text-muted-foreground font-mono text-xs">02</p>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-2xl font-bold">{NEXFIY_PRO_PLAN.name}</h2>
                <p className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    {NEXFIY_PRO_PLAN.priceLabel}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {NEXFIY_PRO_PLAN.billingLabel}
                  </span>
                </p>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                For connected workspaces and teams.
              </p>
              <ul className="border-border mt-8 space-y-3 border-t pt-7 text-sm">
                {NEXFIY_PRO_PLAN.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#2383e2]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="border-border mt-8 border-t pt-8">
                <NexfiyProCheckout compact />
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
