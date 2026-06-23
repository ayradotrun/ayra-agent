import { LegalPageLayout, legalMetadata } from "@/components/legal/legal-page-layout";

export const metadata = legalMetadata(
  "Privacy Policy",
  "How AYRA Agent collects, stores, and protects your data."
);

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="June 22, 2025">
      <p>
        AYRA Agent (&quot;AYRA&quot;, &quot;we&quot;, &quot;our&quot;) is a self-hostable platform for building and
        running AI agents. This Privacy Policy explains what information we process when you use
        AYRA Agent and how we protect it.
      </p>

      <h2>1. Who we are</h2>
      <p>
        AYRA Agent is open-source software maintained by{" "}
        <a href="https://github.com/ayradotrun/ayra-agent" target="_blank" rel="noopener noreferrer">
          ayradotrun
        </a>
        . If you use a deployment operated by a third party, that operator is the data controller for
        your account. This policy describes the platform&apos;s default behavior.
      </p>

      <h2>2. Information we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Name and email address when you register</li>
        <li>Hashed password (never stored in plain text)</li>
        <li>Session cookies for authentication</li>
      </ul>

      <h3>Configuration and credentials</h3>
      <ul>
        <li>Agent settings, prompts, skill selections, and schedules</li>
        <li>Encrypted API keys (LLM, Telegram, X, RPC) when you provide them</li>
        <li>Your private Postgres connection URL (encrypted at rest)</li>
      </ul>

      <h3>Usage data</h3>
      <ul>
        <li>Agent run logs, token usage, and error messages</li>
        <li>Chat messages and brain tasks stored in your private database</li>
        <li>Rate-limit and security logs on the server</li>
      </ul>

      <h2>3. Private database (BYOD)</h2>
      <p>
        AYRA requires you to connect your own PostgreSQL database for chat history and AYRA Brain
        tasks. That data stays in <strong>your</strong> database instance — not in a shared
        multi-tenant datastore. Platform operators cannot read your private database contents unless
        they have your connection credentials.
      </p>

      <h2>4. How we use your information</h2>
      <ul>
        <li>Authenticate you and provide the dashboard, chat, and agent features</li>
        <li>Run agents on your behalf using the skills and credentials you configure</li>
        <li>Send notifications via email or Telegram when you opt in</li>
        <li>Improve reliability, security, and abuse prevention</li>
      </ul>
      <p>We do not sell your personal data to third parties.</p>

      <h2>5. Third-party services</h2>
      <p>When you enable integrations, data may be sent to:</p>
      <ul>
        <li>LLM providers (e.g. OpenRouter) for agent inference</li>
        <li>X (Twitter) when you connect OAuth or enable auto-post</li>
        <li>Telegram when you configure a bot token</li>
        <li>Solana RPC providers and public APIs for on-chain research skills</li>
        <li>Your own Postgres provider (Supabase, Neon, etc.)</li>
      </ul>
      <p>Each third party has its own privacy policy. You control which integrations are active.</p>

      <h2>6. Data retention</h2>
      <ul>
        <li>Account and agent data persists until you delete your account</li>
        <li>Chat and brain data in your private database is retained according to your provider&apos;s settings</li>
        <li>Run logs may be retained for operational and debugging purposes</li>
      </ul>

      <h2>7. Security</h2>
      <p>
        Credentials are encrypted with AES-256-GCM when <code>ENCRYPTION_KEY</code> is configured.
        Sessions are protected by NextAuth. See our{" "}
        <a href="/security">Security</a> page for details and operator responsibilities.
      </p>

      <h2>8. Your rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li>Access, correct, or delete your account data</li>
        <li>Export your chat and agent configuration</li>
        <li>Withdraw consent for optional integrations (X, Telegram, email alerts)</li>
        <li>Delete your account from Settings</li>
      </ul>

      <h2>9. Children</h2>
      <p>
        AYRA Agent is not intended for users under 16. We do not knowingly collect data from children.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy as the platform evolves. Material changes will be reflected in the
        &quot;Last updated&quot; date above.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about privacy: email{" "}
        <a href="mailto:support@ayra.run">support@ayra.run</a>, use{" "}
        <a href="https://ayra.run/support" target="_blank" rel="noopener noreferrer">
          AYRA CS Support
        </a>
        , reach us on{" "}
        <a href="https://x.com/Ayradotrun" target="_blank" rel="noopener noreferrer">
          @Ayradotrun
        </a>
        , or open a discussion on{" "}
        <a href="https://github.com/ayradotrun/ayra-agent" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
