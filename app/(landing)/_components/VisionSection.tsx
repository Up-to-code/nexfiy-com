"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const VisionSection = () => {
  const { t } = useI18n();

  return (
    <section id="vision" className="bg-background text-foreground py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="max-w-xl">
          <p className="text-muted-foreground mb-4 text-xs font-bold tracking-[0.18em] uppercase">
            {t("vision.eyebrow")}
          </p>
          <h2 className="text-foreground text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            {t("vision.title")}
          </h2>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            {t("vision.body")}
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[#faf8f5] p-2 shadow-xs sm:p-4 dark:border-zinc-800/60 dark:bg-[#05070a]">
          <Image
            src="/landing/nexfiy-shared-context-v4.png"
            alt={t("vision.imageAlt")}
            width={1200}
            height={800}
            className="h-auto w-full rounded-[1.5rem] object-contain"
          />
        </div>
      </div>
    </section>
  );
};
