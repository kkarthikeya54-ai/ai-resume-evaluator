import LegalLayout, { Section } from "../components/LegalLayout";
import Seo from "../components/Seo";

export default function PrivacyPolicy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="Privacy policy for HireTire — how we collect, use, store, and protect your data."
      />
      <LegalLayout
        title="Privacy Policy"
        updatedAt="September 5, 2026"
        intro="This Privacy Policy explains how the HireTire project (the &quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and protects information when you use our website and tools. We are an academic project operated by a student team as part of the EPICS programme. This policy is written primarily for users in India and follows best-effort privacy principles recognised in the EU (GDPR) and California (CCPA/CPRA)."
      >
        <Section title="1. Who operates this Service">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>The Service is operated by the HireTire academic project team:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>B.S.D. Anshita (24EU04186)</li>
              <li>T. Sri Khyathi (24EU04188)</li>
              <li>K. Karthikeya (24EU04157)</li>
            </ul>
            <p>
              Academic guide: Dr V. Lavanya, Assistant Professor. The project is developed under the
              EPICS programme (BTech Computer Science and Engineering), Kanuru, Vijayawada, Andhra
              Pradesh, India.
            </p>
            <p>
              For questions about this policy or your data, please use the contact channels available
              through the project team and the institution. We are a non-commercial academic project and
              do not sell user data.
            </p>
          </div>
        </Section>

        <Section title="2. Information we collect">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p className="font-bold">Information you provide directly</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account information:</strong> name, email address, and password (stored securely
                by our authentication provider, Firebase Authentication).
              </li>
              <li>
                <strong>Profile information:</strong> role (student or recruiter), phone number,
                location, job title, LinkedIn/GitHub/portfolio links, work experience, education,
                skills, and GPA that you choose to enter.
              </li>
              <li>
                <strong>Resumes and documents:</strong> the resume files (PDF, DOCX, text) you upload or
                paste, which we process to evaluate placement readiness or rank candidates.
              </li>
            </ul>
            <p className="font-bold pt-2">Information we collect automatically</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Browser storage:</strong> to keep you signed in and remember your settings, we
                use your browser&rsquo;s local storage (localStorage, IndexedDB, and sessionStorage).
                This data stays on your device unless you choose to sync it to our cloud.
              </li>
              <li>
                <strong>Basic diagnostics:</strong> Firebase may record standard service logs (for
                example error details and request metadata) for the sole purpose of operating and
                securing the Service. We do not run advertising or behavioural analytics.
              </li>
            </ul>
          </div>
        </Section>

        <Section title="3. How we use your information">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, operate, and maintain your account and the Service.</li>
              <li>Parse resumes and generate readiness scores, skill-gap analysis, roadmaps, interview questions, and candidate rankings.</li>
              <li>Let recruiters upload, evaluate, compare, and rank candidate resumes in sessions.</li>
              <li>Save sessions and candidates so you can return to them later (locally by default, and to our cloud if you opt in through your recruiter workspace).</li>
              <li>Communicate with you about your account (for example password reset emails).</li>
              <li>Improve the Service, detect abuse, and keep it secure.</li>
            </ul>
            <p className="pt-2">
              We process personal information only where it is necessary to provide the Service as
              requested by you, where you have given consent, where we have a legitimate interest (such
              as security and abuse prevention), or where required by law.
            </p>
          </div>
        </Section>

        <Section title="4. AI evaluation and third-party processing">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              When you run an evaluation, the text extracted from your resume is transmitted to an
              artificial-intelligence inference service (NVIDIA NIM, reached through a Cloudflare Worker
              proxy) so that it can be analysed and scored. This is a necessary part of providing the
              feature you requested.
            </p>
            <p>
              We rely on the following providers to operate the Service. Each processes only the data
              needed for the task:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Firebase / Google Cloud</strong> (Google LLC) — authentication, and optional cloud sync of sessions and profiles.</li>
              <li><strong>NVIDIA NIM and Cloudflare</strong> — AI inference used to evaluate resumes.</li>
              <li><strong>Google Fonts / Fontsource</strong> — typography. Fonts are served from our own domain and are not a tracking connection.</li>
            </ul>
            <p>
              Some of these providers are located outside India (for example in the United States). By
              using the Service you understand that data required to operate it may be processed in
              these locations.
            </p>
            <p className="font-bold">A note about synced recruiter data</p>
            <p>
              When you save a recruiter session, candidate resumes and evaluation results may be stored
              in our cloud database so that you can access them from other devices. Candidate names and
              contact details are supplied by the resume you upload. Only you (the account that created
              the session) can access it, and you can delete it at any time from the Sessions page or by
              deleting your account.
            </p>
          </div>
        </Section>

        <Section title="5. Cookies and local storage">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              We do not set advertising, tracking, or social-media cookies. To keep you signed in and
              remember your preferences and analysis results, the Service stores data in your
              browser&rsquo;s local storage (including IndexedDB, which the Service uses for offline
              storage of your sessions and candidates). This data stays on your device.
            </p>
            <p>
              See our <strong>Cookie Policy</strong> for details and instructions on clearing this data.
            </p>
          </div>
        </Section>

        <Section title="6. Data retention">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <ul className="list-disc pl-5 space-y-1">
              <li>Data stored in your browser stays on your device until you clear it or delete your account.</li>
              <li>Account records are kept while your account is active. When you delete your account, we remove your cloud-stored profile and sessions.</li>
              <li>Standard service logs are retained for a limited period for security and troubleshooting and then deleted.</li>
            </ul>
          </div>
        </Section>

        <Section title="7. Your rights">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              Depending on where you live, you may have the right to access, correct, delete, or
              download a copy of your personal information, to object to or restrict certain processing,
              and to withdraw consent at any time. If you are in the EU/EEA or the UK, rights under the
              GDPR apply; if you are in California, rights under the CCPA/CPRA apply; if you are in
              India, rights under the Digital Personal Data Protection Act, 2023 apply, including the
              right to seek correction and erasure and to nominate an individual to exercise rights on
              your behalf in the event of your incapacity or death.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access and correct:</strong> view and update your profile under Account &rarr; Profile.</li>
              <li><strong>Delete:</strong> use &ldquo;Delete Account Data&rdquo; in Account &rarr; Security &amp; Settings, or delete your sessions from the Sessions page.</li>
              <li><strong>Object or withdraw consent:</strong> stop using the relevant feature; you can delete your account at any time.</li>
            </ul>
            <p>
              To exercise these rights, contact the project team through the channels described in
              Section 1. We will respond as soon as reasonably possible, and we will not discriminate
              against you for exercising these rights.
            </p>
          </div>
        </Section>

        <Section title="8. Children&rsquo;s privacy">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              The Service is intended for college students, job seekers, and recruiters, who are
              generally 18 years of age or older, and is not directed at children under 13. We do not
              knowingly collect personal information from children under 13, and we ask that they not
              use the Service. If you believe a child has provided us personal information, please
              contact us using the channels in Section 1 so we can delete it.
            </p>
          </div>
        </Section>

        <Section title="9. Security">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              We use industry-standard measures to protect your information, including encrypted
              connections (HTTPS), secure password handling through Firebase Authentication, and
              access-controlled cloud storage. No method of transmission or storage is 100% secure, so
              while we work hard to protect your data, we cannot guarantee absolute security. Please do
              not upload resumes containing financial account numbers, national ID numbers, or other
              highly sensitive information unless necessary.
            </p>
          </div>
        </Section>

        <Section title="10. Changes to this Policy">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              We may update this Policy from time to time. When we do, we will revise the
              &ldquo;Last updated&rdquo; date at the top of this page and, where appropriate, notify you
              within the Service. Continued use of the Service after changes take effect means you
              accept the updated Policy.
            </p>
          </div>
        </Section>
      </LegalLayout>
    </>
  );
}