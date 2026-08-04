"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const AiFeatures = () => {
  const { t } = useI18n();

  const features = [
    {
      eyebrow: t("ai.feature1.eyebrow"),
      title: t("ai.feature1.title"),
      image: "/landing/nexfiy-capture-knowledge-v4.png",
      alt: t("ai.feature1.alt"),
    },
    {
      eyebrow: t("ai.feature2.eyebrow"),
      title: t("ai.feature2.title"),
      image: "/landing/nexfiy-find-answers-v4.png",
      alt: t("ai.feature2.alt"),
    },
    {
      eyebrow: t("ai.feature3.eyebrow"),
      title: t("ai.feature3.title"),
      image: "/landing/nexfiy-automate-work-v4.png",
      alt: t("ai.feature3.alt"),
    },
  ];

  return (
    <section
      id="ai"
      className="border-border/40 bg-background text-foreground border-t py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-foreground mb-12 text-3xl font-extrabold tracking-tight sm:text-5xl">
          {t("ai.title")}
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.eyebrow}
              className="border-border/50 dark:bg-card flex flex-col rounded-3xl border bg-[#f6f5f4] p-6 shadow-xs sm:p-8"
            >
              <p className="text-muted-foreground mb-4 text-xs font-bold tracking-wider uppercase">
                {feature.eyebrow}
              </p>
              <h3 className="text-foreground text-2xl font-bold">
                {feature.title}
              </h3>

              <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-[#faf8f5] dark:border-zinc-800/60 dark:bg-[#05070a]">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={600}
                  height={400}
                  className="h-auto w-full object-contain"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
