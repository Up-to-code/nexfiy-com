"use client";

import { RotateCcw } from "lucide-react";
import { LegalContact, LegalPage } from "@/components/marketing/LegalPage";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function RefundPolicyPage() {
  const { t } = useI18n();

  return (
    <LegalPage
      icon={RotateCcw}
      label={t("refundPage.label")}
      title={t("refundPage.title")}
      description={t("refundPage.description")}
    >
      <p className="text-foreground text-lg leading-8">{t("refundPage.intro")}</p>

      <section>
        <h2>{t("refundPage.section1Title")}</h2>
        <p>{t("refundPage.section1Body")}</p>
      </section>

      <section>
        <h2>{t("refundPage.section2Title")}</h2>
        <p>{t("refundPage.section2Body")}</p>
      </section>

      <section>
        <h2>{t("refundPage.section3Title")}</h2>
        <p>{t("refundPage.section3Body")}</p>
      </section>

      <section>
        <h2>{t("refundPage.section4Title")}</h2>
        <p>{t("refundPage.section4Body")}</p>
      </section>

      <section>
        <h2>{t("refundPage.section5Title")}</h2>
        <p>{t("refundPage.section5Body")}</p>
      </section>

      <section className="border-t pt-8">
        <h2>{t("refundPage.contactTitle")}</h2>
        <p>{t("refundPage.contactBody")}</p>
        <LegalContact>
          {t("refundPage.contactCompany")}
          <br />
          {t("refundPage.contactEmail")}
        </LegalContact>
      </section>
    </LegalPage>
  );
}
