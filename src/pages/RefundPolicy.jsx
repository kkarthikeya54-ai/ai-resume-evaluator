import LegalLayout, { Section } from "../components/LegalLayout";
import Seo from "../components/Seo";

export default function RefundPolicy() {
  return (
    <>
      <Seo
        title="Refund Policy"
        description="Refund policy for the HireTire service."
      />
      <LegalLayout
        title="Refund Policy"
        updatedAt="September 5, 2026"
        intro="This Refund Policy explains the payment and refund terms (if any) for the HireTire Service."
      >
        <Section title="1. The Service is free">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              The HireTire Service is currently provided free of charge. We do not collect
              fees, subscriptions, or payments from users, and no payment information is requested or
              stored by the Service.
            </p>
          </div>
        </Section>

        <Section title="2. No refunds applicable">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              Because no payments are charged for the Service, no refunds are owed or applicable. Any
              references to prices, payments, or refunds elsewhere should be disregarded unless that
              situation changes in the future.
            </p>
          </div>
        </Section>

        <Section title="3. If paid features are added later">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              If the project team ever introduces paid features, this Refund Policy will be updated to
              explain any charges, cancellation rights, and refund terms clearly, and you will not be
              charged unless you explicitly agree to the purchase.
            </p>
          </div>
        </Section>

        <Section title="4. Data you have uploaded">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              Regardless of any future pricing, you may delete the data you have uploaded (sessions,
              candidates, and profile) at any time from the Sessions page or from Account &rarr;
              Security &amp; Settings &rarr; Delete Account Data, without cost.
            </p>
          </div>
        </Section>

        <Section title="5. Contact">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              If you have any questions about this Refund Policy, please reach the project team through
              the contact channels described in the Privacy Policy, Section 1.
            </p>
          </div>
        </Section>
      </LegalLayout>
    </>
  );
}