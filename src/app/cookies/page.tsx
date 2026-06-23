import { LegalPageLayout, legalMetadata } from "@/components/legal/legal-page-layout";

export const metadata = legalMetadata(
  "Cookie Policy",
  "How AYRA Agent uses cookies and similar technologies."
);

export default function CookiesPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated="June 22, 2025">
      <p>
        This Cookie Policy explains how AYRA Agent uses cookies and similar browser storage when you
        visit the dashboard and marketing pages.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device. They help websites remember your session,
        preferences, and security settings.
      </p>

      <h2>2. Cookies we use</h2>

      <h3>Strictly necessary</h3>
      <ul>
        <li>
          <strong>Session cookie (NextAuth)</strong> — Keeps you signed in after login. Required for
          the dashboard to function. Expires when you sign out or the session ends.
        </li>
        <li>
          <strong>CSRF / security tokens</strong> — Protect authentication flows from cross-site
          request forgery.
        </li>
      </ul>

      <h3>Functional</h3>
      <ul>
        <li>
          <strong>UI preferences</strong> — May store sidebar state or theme choices in local storage
          for a better experience. Not used for advertising.
        </li>
      </ul>

      <h2>3. What we do not use</h2>
      <ul>
        <li>Third-party advertising cookies</li>
        <li>Cross-site tracking pixels for marketing retargeting</li>
        <li>Social media embed trackers on the landing page</li>
      </ul>

      <h2>4. Third-party cookies</h2>
      <p>
        If you use OAuth to connect X (Twitter), you may be redirected to X&apos;s domain, which sets
        its own cookies under X&apos;s policy. AYRA does not control third-party cookies on external
        sites.
      </p>

      <h2>5. Managing cookies</h2>
      <p>
        You can block or delete cookies in your browser settings. Blocking strictly necessary cookies
        will prevent you from staying signed in to the dashboard.
      </p>

      <h2>6. Updates</h2>
      <p>
        We may update this policy if our cookie practices change. See the &quot;Last updated&quot; date
        above.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions: email <a href="mailto:support@ayra.run">support@ayra.run</a>, use{" "}
        <a href="https://ayra.run/support" target="_blank" rel="noopener noreferrer">
          AYRA CS Support
        </a>
        , or{" "}
        <a href="https://x.com/Ayradotrun" target="_blank" rel="noopener noreferrer">
          @Ayradotrun
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
