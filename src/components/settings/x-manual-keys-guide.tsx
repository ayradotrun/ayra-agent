import Link from "next/link";

export function XManualKeysGuide() {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-sm sm:col-span-2">
      <p className="font-medium">Manual X API keys — setup guide</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Prefer{" "}
        <Link href="/api/x/connect" className="text-primary underline-offset-2 hover:underline">
          Connect with X
        </Link>{" "}
        when available. Use manual keys only if OAuth is not configured on this server.
      </p>

      <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs text-muted-foreground">
        <li>
          Open{" "}
          <a
            href="https://developer.x.com/en/portal/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            developer.x.com
          </a>{" "}
          → your Project → App → <strong className="text-foreground">Keys and tokens</strong>.
        </li>
        <li>
          Set app permissions to <strong className="text-foreground">Read and write</strong> (Settings /
          User authentication). Regenerate tokens after changing permissions.
        </li>
        <li>
          Copy <strong className="text-foreground">Consumer Keys</strong>: API Key + API Key Secret → AYRA
          API Key &amp; API Secret.
        </li>
        <li>
          Generate <strong className="text-foreground">Access Token and Secret</strong> with{" "}
          <strong className="text-foreground">Read and write</strong> → AYRA Access Token &amp; Access
          Secret.
        </li>
        <li>
          Paste all <strong className="text-foreground">four</strong> fields below →{" "}
          <strong className="text-foreground">Save settings</strong>. Status must show{" "}
          <strong className="text-foreground">Connected as @your_handle</strong>.
        </li>
        <li>
          Enable <strong className="text-foreground">Allow auto-post to X</strong> here and{" "}
          <strong className="text-foreground">Auto-post to X</strong> on each agent that should publish.
        </li>
      </ol>

      <p className="mt-3 text-xs text-muted-foreground">
        Full tutorial:{" "}
        <a
          href="https://github.com/ayradotrun/ayra-agent/blob/main/docs/x-manual-keys.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          docs/x-manual-keys.md
        </a>
      </p>
    </div>
  );
}
