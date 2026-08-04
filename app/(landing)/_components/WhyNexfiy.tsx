"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const WhyNexfiy = () => {
  const { t } = useI18n();

  const benefits = [
    t("why.benefit1"),
    t("why.benefit2"),
    t("why.benefit3"),
    t("why.benefit4"),
  ];

  return (
    <section
      id="why-nexfiy"
      className="bg-secondary/30 dark:bg-background text-foreground py-24"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[#faf8f5] p-2 shadow-xs sm:p-4 lg:order-first dark:border-zinc-800/60 dark:bg-[#05070a]">
          <Image
            src="/landing/nexfiy-connected-workspace-v4.png"
            alt={t("why.imageAlt")}
            width={1200}
            height={800}
            className="h-auto w-full rounded-[1.5rem] object-contain"
          />
        </div>

        <div className="max-w-xl">
          <p className="text-muted-foreground mb-4 text-xs font-bold tracking-[0.18em] uppercase">
            {t("why.eyebrow")}
          </p>
          <h2 className="text-foreground text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            {t("why.title")}
          </h2>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            {t("why.body")}
          </p>

          <ul className="mt-8 space-y-4">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="text-foreground/90 flex items-start gap-3"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#fff2c2] text-zinc-900 dark:bg-amber-950/60 dark:text-amber-200">
                  <Check className="size-3.5" />
                </span>
                <span className="leading-6">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
