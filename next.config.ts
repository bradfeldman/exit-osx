import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// SEC-026: CSP is now set dynamically in middleware with per-request nonces.
// Only the static security headers below are applied via next.config.ts.
// API routes and evidence viewer retain their own static CSPs in the headers() config.

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
  // SEC-026: CSP moved to middleware (nonce-based) — see src/middleware.ts
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
        // SECURITY: Prevent caching of financial and company data API responses
        source: '/api/companies/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
      {
        // SECURITY: Prevent caching of deal data API responses
        source: '/api/deals/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
      {
        // SECURITY: Prevent caching of subscription data API responses
        source: '/api/subscription/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
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
      // Financial statement tab redirects
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

      // Legacy route redirects (PROD-025)
      // Redirect old action plan routes to ACTIONS mode
      {
        source: '/dashboard/playbook',
        destination: '/dashboard/actions',
        permanent: true,
      },
      {
        source: '/dashboard/action-plan',
        destination: '/dashboard/actions',
        permanent: true,
      },

      // Redirect old assessment routes to DIAGNOSIS mode
      {
        source: '/dashboard/assessment',
        destination: '/dashboard/diagnosis',
        permanent: true,
      },
      {
        source: '/dashboard/assessment/:path*',
        destination: '/dashboard/diagnosis',
        permanent: true,
      },
      {
        source: '/dashboard/assessments',
        destination: '/dashboard/diagnosis',
        permanent: true,
      },
      {
        source: '/dashboard/assessments/:path*',
        destination: '/dashboard/diagnosis',
        permanent: true,
      },

      // Redirect old deal/contact routes to DEAL ROOM mode
      {
        source: '/dashboard/deal-tracker',
        destination: '/dashboard/deal-room',
        permanent: true,
      },
      {
        source: '/dashboard/deal-tracker/:path*',
        destination: '/dashboard/deal-room',
        permanent: true,
      },
      {
        source: '/dashboard/contacts',
        destination: '/dashboard/deal-room',
        permanent: true,
      },
      {
        source: '/dashboard/contacts/:path*',
        destination: '/dashboard/deal-room',
        permanent: true,
      },
      {
        source: '/dashboard/data-room',
        destination: '/dashboard/deal-room',
        permanent: true,
      },
      {
        source: '/dashboard/deals',
        destination: '/dashboard/deal-room',
        permanent: true,
      },
      {
        source: '/dashboard/deals/:path*',
        destination: '/dashboard/deal-room',
        permanent: true,
      },

      // Redirect old value builder to VALUE mode (home dashboard)
      {
        source: '/dashboard/value-builder',
        destination: '/dashboard',
        permanent: true,
      },

      // Redirect developer tools to admin (admin-only access enforced by middleware)
      {
        source: '/dashboard/developer/:path*',
        destination: '/admin/tools/:path*',
        permanent: true,
      },
      {
        source: '/dashboard/global/:path*',
        destination: '/admin/tools/:path*',
        permanent: true,
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
