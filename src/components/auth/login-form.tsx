"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackground } from "@/components/layout/grid-background";
import { loginErrorMessage, safeCallbackUrl } from "@/lib/auth/login-errors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      login: login.trim(),
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError(loginErrorMessage(result.error));
    } else if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(loginErrorMessage(undefined));
    }
  }

  return (
    <GridBackground>
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md glow-emerald">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <AyraLogo size={48} priority className="ring-1 ring-primary/30" />
            </div>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in with your username or email</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Username or email</Label>
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </GridBackground>
  );
}
