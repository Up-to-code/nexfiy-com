"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export const ComparisonSection = () => {
  const { t } = useI18n();

  const comparisonRows = [
    {
      capability: t("compare.row1.capability"),
      nexfiy: t("compare.row1.nexfiy"),
      typical: t("compare.row1.typical"),
    },
    {
      capability: t("compare.row2.capability"),
      nexfiy: t("compare.row2.nexfiy"),
      typical: t("compare.row2.typical"),
    },
    {
      capability: t("compare.row3.capability"),
      nexfiy: t("compare.row3.nexfiy"),
      typical: t("compare.row3.typical"),
    },
    {
      capability: t("compare.row4.capability"),
      nexfiy: t("compare.row4.nexfiy"),
      typical: t("compare.row4.typical"),
    },
    {
      capability: t("compare.row5.capability"),
      nexfiy: t("compare.row5.nexfiy"),
      typical: t("compare.row5.typical"),
    },
  ];

  return (
    <section
      id="compare"
      className="bg-background text-foreground border-border/40 border-t py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-muted-foreground mb-3 text-xs font-bold tracking-[0.18em] uppercase">
            {t("compare.eyebrow")}
          </p>
          <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("compare.title")}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg leading-8">
            {t("compare.body")}
          </p>
        </div>

        <div className="border-border/50 overflow-hidden border-y">
          <div className="bg-muted/40 text-foreground hidden grid-cols-[1.15fr_1fr_1fr] px-7 py-4 text-sm font-semibold sm:grid dark:bg-zinc-900/60">
            <span>{t("compare.colCapability")}</span>
            <span>{t("compare.colStarts")}</span>
            <span>{t("compare.colEnables")}</span>
          </div>
          {comparisonRows.map((row) => (
            <div
              key={row.capability}
              className="border-border/40 grid grid-cols-1 gap-3 border-t px-5 py-5 sm:grid-cols-[1.15fr_1fr_1fr] sm:gap-6 sm:px-7"
            >
              <p className="text-foreground font-semibold">{row.capability}</p>
              <p className="text-foreground/90 flex items-start gap-2 text-sm leading-6">
                <span>
                  <span className="font-semibold sm:hidden">
                    {t("compare.startsWith")}
                  </span>
                  {row.nexfiy}
                </span>
              </p>
              <p className="text-muted-foreground text-sm leading-6">
                <span>
                  <span className="font-semibold sm:hidden">
                    {t("compare.enables")}
                  </span>
                  {row.typical}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
