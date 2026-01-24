'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'

// Dynamically import the chart component to reduce initial bundle size
// Recharts is ~170KB and only needed on dashboard pages
const ValueHistoryChart = dynamic(
  () => import('./ValueHistoryChart').then((mod) => ({ default: mod.ValueHistoryChart })),
  {
    loading: () => (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    ),
    ssr: false, // Recharts doesn't work well with SSR
  }
)

interface ValueHistoryChartDynamicProps {
  companyId: string
}

export function ValueHistoryChartDynamic({ companyId }: ValueHistoryChartDynamicProps) {
  return <ValueHistoryChart companyId={companyId} />
}
