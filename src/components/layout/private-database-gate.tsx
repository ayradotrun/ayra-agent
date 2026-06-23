"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function PrivateDatabaseGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const onSettings = pathname === "/dashboard/settings";

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (onSettings) {
        setReady(true);
        return;
      }

      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          setReady(true);
          return;
        }
        const data = (await res.json()) as { hasBrainDatabaseUrl?: boolean };
        if (cancelled) return;

        if (!data.hasBrainDatabaseUrl) {
          router.replace("/dashboard/settings?required=private-db");
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [onSettings, pathname, router]);

  if (!ready && !onSettings) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
