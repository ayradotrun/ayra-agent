export const LOGIN_ERROR = {
  MISSING: "MissingCredentials",
  INVALID: "InvalidCredentials",
  UNVERIFIED: "EmailNotVerified",
} as const;

export type LoginErrorCode = (typeof LOGIN_ERROR)[keyof typeof LOGIN_ERROR];

export function loginErrorMessage(code: string | undefined): string {
  switch (code) {
    case LOGIN_ERROR.UNVERIFIED:
      return "Email not verified. Check your inbox for the 6-digit code or sign up again.";
    case LOGIN_ERROR.MISSING:
      return "Enter your username or email and password.";
    case LOGIN_ERROR.INVALID:
    default:
      return "Invalid username/email or password.";
  }
}

/** Only allow same-origin relative callback paths. */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}
