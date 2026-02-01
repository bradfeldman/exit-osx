import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { GoogleTagManager, GoogleTagManagerBody } from "@/components/analytics";
import { AnalyticsProvider } from "@/lib/analytics/provider";
import { MotionProvider } from "@/lib/motion";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Exit OSx - Build a Business Buyers Want to Own",
    template: "%s | Exit OSx",
  },
  description:
    "Get your real-time business valuation, Buyer Readiness Score, and personalized playbook to maximize your exit outcome. Start free today.",
  keywords: [
    "business exit planning",
    "M&A readiness",
    "business valuation calculator",
    "buyer readiness score",
    "exit planning software",
    "sell my business",
    "business sale preparation",
    "company valuation",
  ],
  authors: [{ name: "Exit OSx" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Exit OSx",
    title: "Exit OSx - Build a Business Buyers Want to Own",
    description:
      "Real-time valuation, Buyer Readiness Score, and actionable playbook to maximize your exit.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en">
      <head>
        {gtmId && <GoogleTagManager gtmId={gtmId} />}
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {gtmId && <GoogleTagManagerBody gtmId={gtmId} />}
        <AnalyticsProvider>
          <MotionProvider>
            {children}
          </MotionProvider>
          <CookieConsent />
          <Toaster />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
