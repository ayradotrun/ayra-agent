import Link from "next/link";
import { LegalPageLayout, legalMetadata } from "@/components/legal/legal-page-layout";

export const metadata = legalMetadata(
  "Security",
  "How AYRA Agent protects credentials, sessions, and user data."
);

export default function SecurityPage() {
  return (
    <LegalPageLayout title="Security" lastUpdated="June 22, 2025">
      <p>
        Security is core to AYRA Agent. This page summarizes how we protect your data and what you
        should configure when self-hosting. For vulnerability reporting, see our{" "}
        <a
          href="https://github.com/ayradotrun/ayra-agent/blob/main/SECURITY.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          SECURITY.md
        </a>{" "}
        on GitHub.
      </p>

      <h2>What we protect</h2>

      <h3>Credentials at rest</h3>
      <p>
        API keys, Telegram tokens, X OAuth tokens, RPC keys, and private database URLs are encrypted
        with <strong>AES-256-GCM</strong> when <code>ENCRYPTION_KEY</code> is set in your environment.
      </p>

      <h3>Session security</h3>
      <p>
        Authentication uses NextAuth with secure session cookies. Production deployments must use a
        strong, unique <code>NEXTAUTH_SECRET</code>.
      </p>

      <h3>Tenant isolation</h3>
      <p>
        Dashboard APIs scope all data by authenticated <code>userId</code>. Chat and brain data for
        users with a private database URL are stored in their own Postgres — not mixed with other
        tenants.
      </p>

      <h3>Rate limiting</h3>
      <p>API routes and chat endpoints enforce per-user and per-IP rate limits to reduce abuse.</p>

      <h3>Agent safety</h3>
      <ul>
        <li>Run timeouts and max tool calls per agent run</li>
        <li>Explicit skill permissions — agents only use skills you enable</li>
        <li>No shell execution by default</li>
        <li>X auto-post requires double opt-in (account + agent level)</li>
      </ul>

      <h2>Privacy by architecture</h2>
      <p>
        Every account must connect a <strong>private Postgres database</strong> for chat and AYRA Brain
        tasks. Your conversation history and scheduled tasks live in infrastructure you control.
        Learn more in our{" "}
        <Link href="/privacy">Privacy Policy</Link> and{" "}
        <a
          href="https://github.com/ayradotrun/ayra-agent/blob/main/docs/private-database.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          private database guide
        </a>
        .
      </p>

      <h2>Operator checklist (self-hosted)</h2>
      <ul>
        <li>Set <code>ENCRYPTION_KEY</code> — 32+ random bytes, never commit to git</li>
        <li>Set a unique <code>NEXTAUTH_SECRET</code> per deployment</li>
        <li>Restrict <code>DATABASE_URL</code> network access; use TLS</li>
        <li>Run a single worker instance to avoid duplicate Telegram replies</li>
        <li>Never commit <code>.env</code>; rotate keys immediately if leaked</li>
        <li>Keep dependencies updated; watch GitHub security advisories</li>
      </ul>

      <h2>Reporting vulnerabilities</h2>
      <p>
        <strong>Do not open public GitHub issues for security vulnerabilities.</strong> Report
        privately via the channel listed in SECURITY.md. Include impact, reproduction steps, and
        affected component — without secrets.
      </p>
      <p>We aim to acknowledge reports within 72 hours.</p>

      <h2>Open source transparency</h2>
      <p>
        AYRA Agent is MIT-licensed. You can audit the codebase, self-host, and verify how data is
        handled. View the source on{" "}
        <a href="https://github.com/ayradotrun/ayra-agent" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>

      <h2>Contact</h2>
      <p>
        Security questions: email <a href="mailto:support@ayra.run">support@ayra.run</a> or use{" "}
        <a href="https://ayra.run/support" target="_blank" rel="noopener noreferrer">
          AYRA CS Support
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
