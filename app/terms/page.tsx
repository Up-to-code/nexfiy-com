"use client";

import { FileText } from "lucide-react";
import { LegalContact, LegalPage } from "@/components/marketing/LegalPage";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <LegalPage
      icon={FileText}
      label={t("termsPage.label")}
      title={t("termsPage.title")}
      description={t("termsPage.description")}
    >
      <p className="text-foreground text-lg leading-8">{t("termsPage.intro")}</p>

      <section>
        <h2>{t("termsPage.section1Title")}</h2>
        <p>{t("termsPage.section1Body")}</p>
      </section>

      <section>
        <h2>{t("termsPage.section2Title")}</h2>
        <p>{t("termsPage.section2Body")}</p>
      </section>

      <section>
        <h2>{t("termsPage.section3Title")}</h2>
        <p>{t("termsPage.section3Body")}</p>
      </section>

      <section>
        <h2>{t("termsPage.section4Title")}</h2>
        <p>{t("termsPage.section4Body")}</p>
        <ul className="mt-4 list-disc">
          <li>{t("termsPage.section4Item1")}</li>
          <li>{t("termsPage.section4Item2")}</li>
          <li>{t("termsPage.section4Item3")}</li>
          <li>{t("termsPage.section4Item4")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("termsPage.section5Title")}</h2>
        <p>{t("termsPage.section5Body")}</p>
      </section>

      <section className="border-t pt-8">
        <h2>{t("termsPage.contactTitle")}</h2>
        <p>{t("termsPage.contactBody")}</p>
        <LegalContact>
          {t("termsPage.contactCompany")}
          <br />
          {t("termsPage.contactEmail")}
        </LegalContact>
      </section>
    </LegalPage>
  );
}
