"use client";

import { ShieldCheck } from "lucide-react";
import { LegalContact, LegalPage } from "@/components/marketing/LegalPage";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <LegalPage
      icon={ShieldCheck}
      label={t("privacyPage.label")}
      title={t("privacyPage.title")}
      description={t("privacyPage.description")}
    >
      <p className="text-foreground text-lg leading-8">{t("privacyPage.intro")}</p>

      <section>
        <h2>{t("privacyPage.section1Title")}</h2>
        <p>{t("privacyPage.section1Body")}</p>
        <ul className="mt-4 list-disc">
          <li>
            <strong>{t("privacyPage.section1Item1Label")}</strong>{" "}
            {t("privacyPage.section1Item1")}
          </li>
          <li>
            <strong>{t("privacyPage.section1Item2Label")}</strong>{" "}
            {t("privacyPage.section1Item2")}
          </li>
          <li>
            <strong>{t("privacyPage.section1Item3Label")}</strong>{" "}
            {t("privacyPage.section1Item3")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("privacyPage.section2Title")}</h2>
        <p>{t("privacyPage.section2Body")}</p>
      </section>

      <section>
        <h2>{t("privacyPage.section3Title")}</h2>
        <p>{t("privacyPage.section3Body")}</p>
      </section>

      <section>
        <h2>{t("privacyPage.section4Title")}</h2>
        <p>{t("privacyPage.section4Body")}</p>
      </section>

      <section>
        <h2>{t("privacyPage.section5Title")}</h2>
        <p>{t("privacyPage.section5Body")}</p>
      </section>

      <section className="border-t pt-8">
        <h2>{t("privacyPage.contactTitle")}</h2>
        <p>{t("privacyPage.contactBody")}</p>
        <LegalContact>
          {t("privacyPage.contactCompany")}
          <br />
          {t("privacyPage.contactEmail")}
        </LegalContact>
      </section>
    </LegalPage>
  );
}
