"use client";

import { Button } from "@/components/ui/button";
import { NexfiyProCheckout } from "@/features/billing/NexfiyProCheckout";
import { NEXFIY_PRO_PLAN } from "@/features/billing/plan-content";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Footer } from "../(landing)/_components/Footer";
import { Navbar } from "../(landing)/_components/Navbar";

export default function PricingPage() {
  const { t } = useI18n();

  const freeFeatures = [
    t("pricingPage.freeFeature1"),
    t("pricingPage.freeFeature2"),
    t("pricingPage.freeFeature3"),
  ];

  const proFeatures = [
    t("pricingPage.proFeature1"),
    t("pricingPage.proFeature2"),
    t("pricingPage.proFeature3"),
    t("pricingPage.proFeature4"),
    t("pricingPage.proFeature5"),
    t("pricingPage.proFeature6"),
    t("pricingPage.proFeature7"),
    t("pricingPage.proFeature8"),
    t("pricingPage.proFeature9"),
  ];

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-32 pb-24">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
              {t("pricingPage.eyebrow")}
            </p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-7xl">
              {t("pricingPage.title")}
            </h1>
          </header>

          <div className="border-border mt-14 grid border-y lg:grid-cols-2">
            {/* Free plan */}
            <article className="border-border flex flex-col py-10 sm:px-8 lg:border-r lg:px-10 lg:py-12">
              <p className="text-muted-foreground font-mono text-xs">01</p>
              <div className="mt-8 flex items-end justify-between gap-4">
                <h2 className="text-2xl font-bold">{t("pricingPage.freeTitle")}</h2>
                <p className="text-4xl font-bold">{t("pricingPage.freePrice")}</p>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                {t("pricingPage.freeDescription")}
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
                  {t("pricingPage.startFree")}
                  <ArrowRight className="ms-2 size-4" />
                </Link>
              </Button>
            </article>

            {/* Pro plan */}
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
                {t("pricingPage.proDescription")}
              </p>
              <ul className="border-border mt-8 space-y-3 border-t pt-7 text-sm">
                {proFeatures.map((feature) => (
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
