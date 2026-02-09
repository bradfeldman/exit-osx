import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// SECURITY: Content Security Policy
// Adjust these directives based on your actual resource origins
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://*.sentry.io https://browser.sentry-cdn.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co https://www.gravatar.com https://www.googletagmanager.com https://www.google-analytics.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  frame-src 'self' https://js.stripe.com https://vercel.live;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.intuit.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://*.sentry.io;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Enable strict HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Prevent XSS attacks
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  // Prevent browser from making DNS queries for external resources
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // Control browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

// SECURITY: Allowed origins for CORS
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://app.exitosx.com',
  'https://admin.exitosx.com',
  'https://staging.exitosx.com',
].filter(Boolean);

const nextConfig: NextConfig = {
  /* config options here */

  // SECURITY: Limit request body size to prevent DoS
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },

  // SECURITY: Apply security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // SECURITY: CORS and stricter CSP for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; frame-ancestors 'none';",
          },
          // CORS headers
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigins[0], // Primary origin
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
      {
        // Evidence document viewer serves HTML from an API route — needs
        // a permissive CSP so inline styles and Supabase-hosted images load.
        // Placed after the general /api/:path* entry so it overrides the
        // strict "default-src 'none'" policy for this specific path.
        source: '/api/companies/:id/evidence/documents/:docId/view',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; style-src 'unsafe-inline'; img-src https://*.supabase.co blob: data:; frame-src https://*.supabase.co; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/dashboard/financials/pnl',
        destination: '/dashboard/financials/statements?tab=pnl',
        permanent: false,
      },
      {
        source: '/dashboard/financials/balance-sheet',
        destination: '/dashboard/financials/statements?tab=balance-sheet',
        permanent: false,
      },
      {
        source: '/dashboard/financials/add-backs',
        destination: '/dashboard/financials/statements?tab=add-backs',
        permanent: false,
      },
      {
        source: '/dashboard/financials/cash-flow',
        destination: '/dashboard/financials/statements?tab=cash-flow',
        permanent: false,
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in production
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

// Wrap config with both bundle analyzer and Sentry
const configWithPlugins = withBundleAnalyzer(nextConfig);

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithPlugins, sentryWebpackPluginOptions)
  : configWithPlugins;
