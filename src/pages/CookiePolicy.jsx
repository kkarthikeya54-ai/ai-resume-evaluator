import LegalLayout, { Section } from "../components/LegalLayout";
import Seo from "../components/Seo";

export default function CookiePolicy() {
  return (
    <>
      <Seo
        title="Cookie Policy"
        description="Cookie and browser-storage policy for the HireTire service."
      />
      <LegalLayout
        title="Cookie Policy"
        updatedAt="September 5, 2026"
        intro="This Cookie Policy explains how the HireTire Service uses cookies and browser storage, and what you can do about it. It works alongside our Privacy Policy."
      >
        <Section title="1. Do we use cookies?">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              We do not use advertising, analytics, or social-media tracking cookies, and we do not
              sell data to advertisers. The Service relies instead on your browser&rsquo;s built-in
              local storage, described below.
            </p>
          </div>
        </Section>

        <Section title="2. Browser storage we use (localStorage, IndexedDB, sessionStorage)">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>To make the Service work, we store small amounts of data on your device:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Sign-in session:</strong> so you stay signed in when you return (Firebase Authentication).</li>
              <li><strong>Your workspace role and theme preference:</strong> so the app opens the way you left it.</li>
              <li><strong>Your evaluation results and sessions:</strong> stored locally on your device first (offline-first by design), so the app works while offline.</li>
              <li><strong>A record that you have seen this notice:</strong> so we don&rsquo;t show it to you repeatedly.</li>
            </ul>
            <p>
              This storage is functional — it is necessary to provide the features you ask for — and it
              does not move between devices unless you choose to sync recruiter sessions to the cloud
              from within the app.
            </p>
          </div>
        </Section>

        <Section title="3. Third-party connections">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              The Service connects to third-party providers only to operate features you request: (1)
              Firebase for sign-in and optional cloud sync, and (2) an AI inference service (NVIDIA NIM
              via a Cloudflare Worker proxy) to analyse resumes. Fonts are served from our own domain.
              We do not embed third-party social media, advertising widgets, or video players, and we do
              not load analytics or marketing scripts.
            </p>
          </div>
        </Section>

        <Section title="4. What about analytics?">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              We currently run no analytics, advertising, or tracking service that follows you across
              websites. If we ever add analytics in the future, we will ask for your consent before
              enabling it and update this policy.
            </p>
          </div>
        </Section>

        <Section title="5. How to control or clear data">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Sign out</strong> to end your local sign-in session.</li>
              <li><strong>Clear site data</strong> through your browser settings (for example, Chrome: Settings &rarr; Privacy &amp; Security &rarr; Clear browsing data &rarr; &ldquo;Cookies and other site data&rdquo;; Safari: Preferences &rarr; Privacy &rarr; Manage Website Data; Firefox: Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data).</li>
              <li><strong>Delete your cloud data</strong> from Account &rarr; Security &amp; Settings &rarr; Delete Account Data.</li>
              <li>Clearing site data will sign you out and delete your locally saved sessions and preferences. Your account and cloud-stored profiles/sessions are deleted separately using the steps above.</li>
            </ul>
          </div>
        </Section>

        <Section title="6. Consent">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              Because the storage described above is necessary to provide the features you have
              requested, we rely on your request for the Service rather than on ad-tracking consent.
              Where a specific activity requires consent (for example, optional analytics in the future),
              we will only run it after you opt in.
            </p>
          </div>
        </Section>

        <Section title="7. Contact">
          <div className="space-y-3 text-sm leading-relaxed text-[var(--theme-text,#111827)] font-medium">
            <p>
              Questions about this policy can be directed to the project team through the contact
              channels described in the Privacy Policy, Section 1.
            </p>
          </div>
        </Section>
      </LegalLayout>
    </>
  );
}