import type React from "react";
import type { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "../components/theme-provider";

import { Montserrat, Montserrat_Alternates } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const montserratAlternates = Montserrat_Alternates({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "AdSync - AI-Powered Social Ad Manager for Meta & TikTok",
  description:
    "Run Meta & TikTok ads without the complexity. AI handles targeting and copywriting. Get WhatsApp alerts when your ads need attention.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${montserratAlternates.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="adsync-theme">
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
          <Analytics />
        </QueryProvider>
      </body>
    </html>
  );
}
