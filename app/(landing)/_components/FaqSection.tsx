"use client";

import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const FaqSection = () => {
  const { t } = useI18n();

  const faqs = [
    { question: t("faq.faq1.question"), answer: t("faq.faq1.answer") },
    { question: t("faq.faq2.question"), answer: t("faq.faq2.answer") },
    { question: t("faq.faq3.question"), answer: t("faq.faq3.answer") },
    { question: t("faq.faq4.question"), answer: t("faq.faq4.answer") },
    { question: t("faq.faq5.question"), answer: t("faq.faq5.answer") },
    { question: t("faq.faq6.question"), answer: t("faq.faq6.answer") },
    { question: t("faq.faq7.question"), answer: t("faq.faq7.answer") },
  ];

  return (
    <section id="faq" className="bg-background text-foreground py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-8">
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-bold tracking-[0.18em] uppercase">
            {t("faq.eyebrow")}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("faq.title")}
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            {t("faq.body")}
          </p>
        </div>

        <div className="divide-border/60 border-border/60 divide-y border-y">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-semibold marker:content-none">
                <span>{faq.question}</span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="text-muted-foreground max-w-2xl pr-10 pb-5 text-sm leading-7">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
