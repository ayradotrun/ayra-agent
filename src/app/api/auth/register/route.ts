import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Registration now requires email verification. Use POST /api/auth/register/request then /api/auth/register/verify.",
    },
    { status: 410 }
  );
}
