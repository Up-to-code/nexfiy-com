import { FileText } from "lucide-react";
import { LegalContact, LegalPage } from "@/components/marketing/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      icon={FileText}
      label="Legal"
      title="Terms of Service"
      description="The simple rules that govern your account, workspace, and use of Nexfiy."
    >
      <p className="text-foreground text-lg leading-8">
        By creating an account or using Nexfiy, you agree to these terms. If you
        use Nexfiy for an organization, you confirm that you can accept these
        terms on its behalf.
      </p>

      <section>
        <h2>1. Your account</h2>
        <p>
          Keep your account information accurate and your credentials secure.
          You are responsible for activity in your account and should tell us
          promptly about unauthorized access.
        </p>
      </section>

      <section>
        <h2>2. Your content</h2>
        <p>
          You keep ownership of the notes, documents, files, and other content
          in your workspace. You give Nexfiy permission to host and process that
          content only as needed to provide the service.
        </p>
      </section>

      <section>
        <h2>3. Subscription and billing</h2>
        <p>
          Nexfiy Pro costs $5 USD per seat each month after a 7-day free trial.
          It renews monthly until cancelled. Taxes may be added at checkout when
          required, and you can manage or cancel your subscription from your
          workspace billing settings.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>Do not misuse Nexfiy or help anyone else do so. This includes:</p>
        <ul className="mt-4 list-disc">
          <li>accessing accounts or data without permission;</li>
          <li>uploading malware, phishing material, or illegal content;</li>
          <li>disrupting the service or bypassing usage limits; and</li>
          <li>violating applicable law or another person&apos;s rights.</li>
        </ul>
      </section>

      <section>
        <h2>5. Service availability</h2>
        <p>
          We work to keep Nexfiy reliable, but the service may occasionally be
          changed, interrupted, or unavailable. To the extent permitted by law,
          Nexfiy is provided as is and as available.
        </p>
      </section>

      <section className="border-t pt-8">
        <h2>Contact</h2>
        <p>Contact us if you have questions about these terms.</p>
        <LegalContact>
          Nexfiy Labs, Inc.
          <br />
          legal@nexfiy.com
        </LegalContact>
      </section>
    </LegalPage>
  );
}
