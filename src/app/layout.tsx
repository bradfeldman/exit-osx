import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/gdpr/CookieConsent";

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
    default: "Exit OSx - Business Exit Readiness Platform",
    template: "%s | Exit OSx",
  },
  description:
    "Maximize your business value and exit readiness. Get your Buyer Readiness Index, enterprise valuation, and actionable playbook to close your value gap.",
  keywords: [
    "business exit",
    "M&A readiness",
    "business valuation",
    "buyer readiness",
    "exit planning",
    "business sale",
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
    title: "Exit OSx - Business Exit Readiness Platform",
    description:
      "Maximize your business value and exit readiness with data-driven insights.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
