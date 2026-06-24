"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackground } from "@/components/layout/grid-background";

type Step = "details" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        name: name.trim() || undefined,
        email: email.trim(),
        password,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to send verification code");
      return;
    }

    setInfo(data.message || "Verification code sent.");
    setStep("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const res = await fetch("/api/auth/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Verification failed");
      return;
    }

    const login = data.username || email.trim().toLowerCase();
    const result = await signIn("credentials", {
      login,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
  }

  async function resendCode() {
    setLoading(true);
    setError("");
    setInfo("");

    const res = await fetch("/api/auth/register/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        name: name.trim() || undefined,
        email: email.trim(),
        password,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to resend code");
      return;
    }

    setInfo("New verification code sent.");
  }

  return (
    <GridBackground>
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md glow-emerald">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <AyraLogo size={48} priority className="ring-1 ring-primary/30" />
            </div>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>
              {step === "details"
                ? "Choose a permanent username and verify your email"
                : `Enter the 6-digit code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "details" ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    autoComplete="username"
                    pattern="[a-z0-9_]{3,30}"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    3–30 characters, lowercase letters, numbers, underscore. Cannot be changed later.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Display name (optional)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {info && <p className="text-sm text-emerald-400">{info}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || password !== confirmPassword}
                >
                  {loading ? "Sending code..." : "Send verification code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {info && <p className="text-sm text-emerald-400">{info}</p>}
                <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
                  {loading ? "Verifying..." : "Verify & create account"}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => setStep("details")}
                    disabled={loading}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-primary"
                    onClick={resendCode}
                    disabled={loading}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </GridBackground>
  );
}
