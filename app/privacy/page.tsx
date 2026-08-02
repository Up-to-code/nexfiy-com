import { ShieldCheck } from "lucide-react";
import { LegalContact, LegalPage } from "@/components/marketing/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      icon={ShieldCheck}
      label="Privacy"
      title="Privacy Policy"
      description="How Nexfiy collects, uses, and protects the information in your connected workspace."
    >
      <p className="text-foreground text-lg leading-8">
        Your workspace belongs to you. We use your information only to provide,
        protect, and improve Nexfiy—and we do not sell your personal data.
      </p>

      <section>
        <h2>1. Information we collect</h2>
        <p>
          We collect the information needed to create your account, operate your
          workspace, and keep the service reliable.
        </p>
        <ul className="mt-4 list-disc">
          <li>
            <strong>Account information:</strong> your name, email address,
            profile picture, and authentication details.
          </li>
          <li>
            <strong>Workspace content:</strong> notes, documents, files,
            comments, and connection settings you add to Nexfiy.
          </li>
          <li>
            <strong>Service data:</strong> device, browser, log, and usage data
            used to maintain security and performance.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <p>
          We use this information to operate Nexfiy, process subscriptions,
          support collaboration, prevent abuse, and communicate important
          service or security updates.
        </p>
      </section>

      <section>
        <h2>3. Workspace and AI data</h2>
        <p>
          Your content remains scoped to your workspace. Private workspace data
          is not used to train public foundation models without your explicit
          permission.
        </p>
      </section>

      <section>
        <h2>4. Service providers</h2>
        <p>
          We share only the information required by trusted providers that help
          us host the service, process payments, deliver authentication, and
          provide customer support. They may use it only to perform those
          services for Nexfiy.
        </p>
      </section>

      <section>
        <h2>5. Your choices</h2>
        <p>
          You can access, export, correct, or request deletion of your account
          and workspace data. Some records may be retained when required for
          security, billing, or legal compliance.
        </p>
      </section>

      <section className="border-t pt-8">
        <h2>Contact</h2>
        <p>Questions about privacy or your data are welcome.</p>
        <LegalContact>
          Nexfiy Labs, Inc.
          <br />
          privacy@nexfiy.com
        </LegalContact>
      </section>
    </LegalPage>
  );
}
