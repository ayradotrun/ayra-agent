import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const to = options.to.trim().toLowerCase();

  if (!smtpConfigured()) {
    console.info(
      `[email:dev] To: ${to}\nSubject: ${options.subject}\n\n${options.text}\n`
    );
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text.replace(/\n/g, "<br>"),
  });
}

export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  purpose: "signup" | "reset_password"
): Promise<void> {
  const appName = process.env.APP_NAME || "AYRA Agent";
  const isSignup = purpose === "signup";

  await sendEmail({
    to: email,
    subject: isSignup
      ? `${appName} — verify your email`
      : `${appName} — reset your password`,
    text: isSignup
      ? `Your ${appName} verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not create an account, you can ignore this email.`
      : `Your ${appName} password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request a reset, you can ignore this email.`,
  });
}
