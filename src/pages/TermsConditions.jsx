import LegalLayout, { Section } from "../components/LegalLayout";
import Seo from "../components/Seo";

export default function TermsConditions() {
  return (
    <>
      <Seo
        title="Terms & Conditions"
        description="Terms and conditions for using the HireTire service."
      />
      <LegalLayout
        title="Terms & Conditions"
        updatedAt="September 5, 2026"
        intro="These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of the HireTire website and tools (the &quot;Service&quot;), operated by the academic project team described in Section 1. By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service."
      >
        <Section title="1. Operator">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              The Service is a non-commercial academic project developed by the HireTire
              team (B.S.D. Anshita, T. Sri Khyathi, and K. Karthikeya) under the guidance of Dr V.
              Lavanya, Assistant Professor, as part of the EPICS programme (BTech Computer Science and
              Engineering), Kanuru, Vijayawada, Andhra Pradesh, India.
            </p>
          </div>
        </Section>

        <Section title="2. The Service">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              The Service lets students and job seekers evaluate their resumes for placement readiness
              and lets recruiters upload, evaluate, compare, and rank candidate resumes against job
              requirements. Evaluations are generated with the help of artificial intelligence.
            </p>
          </div>
        </Section>

        <Section title="3. Eligibility">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least 13 years old to use the Service.</li>
              <li>If you use the Service on behalf of a company or organisation, you confirm you are authorised to do so.</li>
              <li>You must provide accurate registration information and keep it up to date.</li>
            </ul>
          </div>
        </Section>

        <Section title="4. Your responsibilities">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <ul className="list-disc pl-5 space-y-1">
              <li>Only upload resumes and materials that you own or are authorised to process.</li>
              <li>Do not upload documents that contain sensitive data unless you are required and permitted to do so, and you are responsible for that data.</li>
              <li>Do not misrepresent your identity, qualifications, or your authority to act for another person or business.</li>
              <li>Do not use the Service to infringe the rights of others, to violate applicable law, or to attempt to disrupt or compromise the Service, its providers, or other users.</li>
              <li>Keep your login credentials confidential and notify the project team if you suspect unauthorised use of your account.</li>
            </ul>
          </div>
        </Section>

        <Section title="5. Accounts and termination">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              You are responsible for managing your account. You can delete your account and data at any
              time from Account &rarr; Security &amp; Settings. We may suspend or terminate access to
              the Service, at our discretion, if we reasonably believe you are breaching these Terms or
              misusing the Service.
            </p>
          </div>
        </Section>

        <Section title="6. Ownership and licence">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Your content:</strong> you retain all rights in the resumes and materials you upload. You grant us a limited, worldwide, royalty-free licence to process, store, and display your content solely to provide the Service to you (for example, to extract text and generate scores).</li>
              <li><strong>Our content:</strong> the Service design, text, graphics, and software are owned by the project team and the institution, unless noted otherwise. You may not copy or redistribute them except where expressly permitted.</li>
              <li>All visual elements are original or properly licensed; we do not knowingly use copyrighted images without permission.</li>
            </ul>
          </div>
        </Section>

        <Section title="7. AI-generated content and no guarantee of results">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              Evaluation scores, skill-gap analyses, roadmaps, interview questions, and candidate
              rankings are generated by artificial intelligence and may be incomplete, inaccurate, or
              unsuitable for any particular decision. AI output should be treated as a starting point,
              not as a definitive assessment. The Service does not guarantee employment, selection,
              shortlisting, admission, or any specific outcome, and does not provide legal, financial,
              or career advice.
            </p>
            <p>
              Recruiters are solely responsible for any hiring or candidate decisions they make,
              including verifying candidates&rsquo; qualifications and complying with applicable
              employment and data-protection laws.
            </p>
          </div>
        </Section>

        <Section title="8. Disclaimer of warranties">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, whether express or implied, including implied warranties of
              merchantability, fitness for a particular purpose, and non-infringement. Because this is a
              non-commercial academic project, the Service may be changed, restricted, or discontinued
              at any time without notice.
            </p>
          </div>
        </Section>

        <Section title="9. Limitation of liability">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              To the maximum extent permitted by law, the project team and the institution shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages, or any
              loss of data, opportunity, or profits, arising out of or relating to your use of the
              Service — including decisions you make (or fail to make) based on AI-generated output.
              Your exclusive remedy for dissatisfaction with the Service is to stop using it and delete
              your data. In no event shall our aggregate liability exceed the amount you paid for the
              Service (which is currently zero, because the Service is free).
            </p>
          </div>
        </Section>

        <Section title="10. Indemnification">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              To the extent permitted by law, you agree to indemnify and hold harmless the project team
              and the institution from claims arising from your use of the Service, your uploaded
              content, or your breach of these Terms.
            </p>
          </div>
        </Section>

        <Section title="11. Governing law">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              These Terms are governed by the laws of India. Any dispute relating to the Service shall
              be subject to the exclusive jurisdiction of the courts at Vijayawada, Andhra Pradesh,
              India. If you are a consumer in the EU or UK, mandatory provisions of the consumer law of
              your country of residence continue to apply.
            </p>
          </div>
        </Section>

        <Section title="12. Changes to these Terms">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              We may update these Terms from time to time. Revisions take effect when posted on this
              page, and continued use of the Service after a revision means you accept the updated
              Terms.
            </p>
          </div>
        </Section>

        <Section title="13. Contact">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              If you have questions about these Terms, please reach the project team through the contact
              channels available from the project team and the institution (see the Privacy Policy,
              Section 1).
            </p>
          </div>
        </Section>
      </LegalLayout>
    </>
  );
}