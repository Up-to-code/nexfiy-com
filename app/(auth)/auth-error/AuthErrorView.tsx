"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function AuthErrorView({ error }: { error: string | null }) {
  const { t } = useI18n();

  const content =
    error === "state_mismatch"
      ? {
          title: t("auth.errorSessionExpired"),
          description: t("auth.errorSessionExpiredDescription"),
        }
      : error === "access_denied"
        ? {
            title: t("auth.errorCancelled"),
            description: t("auth.errorCancelledDescription"),
          }
        : {
            title: t("auth.errorGeneric"),
            description: t("auth.errorGenericDescription"),
          };

  return (
    <div className="border-border/70 border-t pt-8">
      <p className="text-muted-foreground text-sm">{t("auth.errorNexfiyAccount")}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
        {content.title}
      </h1>
      <p className="text-muted-foreground mt-4 text-sm leading-6">
        {content.description}
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/sign-in"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          {t("auth.errorTryAgain")}
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t("auth.errorReturnHome")}
        </Link>
      </div>
      {error ? (
        <p className="text-muted-foreground/60 mt-10 font-mono text-[11px]">
          {t("auth.errorReference", { error })}
        </p>
      ) : null}
    </div>
  );
}
