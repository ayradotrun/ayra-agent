import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AYRA Agent — Build AI agents for your dev workflow",
  description:
    "Create agents with skills, memory, schedules, and alerts. A developer-focused platform to build and run AI agents.",
  icons: {
    icon: "/ayra-logo.png",
    apple: "/ayra-logo.png",
  },
  openGraph: {
    title: "AYRA Agent",
    description:
      "Autonomous AI agents for Solana developers and token builders.",
    images: [{ url: "/ayra-logo.png", width: 512, height: 512, alt: "AYRA Agent" }],
  },
  twitter: {
    card: "summary",
    title: "AYRA Agent",
    images: ["/ayra-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
