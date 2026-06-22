import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackground } from "@/components/layout/grid-background";

export default function ForgotPasswordPage() {
  return (
    <GridBackground>
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Password reset is coming soon. Contact support if you need help accessing your account.
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
