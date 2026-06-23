import Link from "next/link";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { AYRA_SUPPORT_CS_URL, AYRA_SUPPORT_EMAIL } from "@/components/brand/ayra-support";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackground } from "@/components/layout/grid-background";

export default function ForgotPasswordPage() {
  return (
    <GridBackground>
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <AyraLogo size={48} className="ring-1 ring-primary/30" />
            </div>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Password reset is coming soon. Contact{" "}
              <a href={`mailto:${AYRA_SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {AYRA_SUPPORT_EMAIL}
              </a>{" "}
              or{" "}
              <a
                href={AYRA_SUPPORT_CS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                CS Support
              </a>{" "}
              if you need help accessing your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </GridBackground>
  );
}
