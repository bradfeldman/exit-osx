import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
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

export default withBundleAnalyzer(nextConfig);
