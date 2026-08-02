import { RotateCcw } from "lucide-react";
import { LegalContact, LegalPage } from "@/components/marketing/LegalPage";

export default function RefundPolicyPage() {
  return (
    <LegalPage
      icon={RotateCcw}
      label="Billing"
      title="Refund Policy"
      description="When a Nexfiy payment can be refunded and how to request one."
    >
      <p className="text-foreground text-lg leading-8">
        We want billing to be clear and fair. Nexfiy Pro starts with a 7-day
        free trial, and you will not be charged if you cancel before it ends.
      </p>

      <section>
        <h2>1. Free trial</h2>
        <p>
          You can cancel at any time during the 7-day trial to avoid a charge.
          If you do not cancel, your paid monthly subscription begins when the
          trial ends.
        </p>
      </section>

      <section>
        <h2>2. First payment</h2>
        <p>
          If Nexfiy is not right for you, contact us within 7 calendar days of
          your first paid charge. We will review the request and, when approved,
          refund that charge to the original payment method.
        </p>
      </section>

      <section>
        <h2>3. Renewal payments</h2>
        <p>
          Monthly renewal charges are generally not refundable because your
          workspace remains available for the paid billing period. You can
          cancel before the next renewal from your billing settings to prevent
          future charges.
        </p>
      </section>

      <section>
        <h2>4. Duplicate or incorrect charges</h2>
        <p>
          Contact us if you believe you were charged twice, billed for the wrong
          seat quantity, or charged after cancelling. We will investigate and
          correct confirmed billing errors.
        </p>
      </section>

      <section>
        <h2>5. Refund timing</h2>
        <p>
          Approved refunds are sent to the original payment method. Your bank or
          card provider may take 5–10 business days to show the credit.
        </p>
      </section>

      <section className="border-t pt-8">
        <h2>Request a refund</h2>
        <p>
          Include your account email, payment date, and invoice or payment ID so
          we can find the charge quickly.
        </p>
        <LegalContact>
          Nexfiy Labs, Inc.
          <br />
          billing@nexfiy.com
        </LegalContact>
      </section>
    </LegalPage>
  );
}
