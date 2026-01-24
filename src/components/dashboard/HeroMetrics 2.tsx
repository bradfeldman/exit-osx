'use client'

import { useState } from 'react'

interface HeroMetricsProps {
  currentValue: number
  potentialValue: number
  valueGap: number
  briScore: number | null
  multiple: number
  multipleRange: {
    low: number
    high: number
  }
  industryName: string
  coreScore: number | null
  isEstimated?: boolean
}

type HoverState = null | 'valueGap' | 'bri' | 'coreIndex' | 'multiple'

const descriptions: Record<Exclude<HoverState, null>, { title: string; description: string }> = {
  valueGap: {
    title: "Value Gap",
    description: "The difference between your current market value and maximum achievable value. Closing this gap is the focus of your playbook tasks.",
  },
  bri: {
    title: "Buyer Readiness Index",
    description: "Measures how prepared your business is for acquisition across 6 categories: Financial, Transferability, Operational, Market, Legal/Tax, and Personal.",
  },
  coreIndex: {
    title: "Core Index",
    description: "Reflects structural business factors: revenue size, revenue model, gross margin, labor intensity, asset intensity, and owner involvement.",
  },
  multiple: {
    title: "EBITDA Multiple",
    description: "The EBITDA multiple applied to your adjusted earnings. Determined by your industry range, Core Index positioning, and BRI-based discount.",
  },
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function getBriColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

function getCoreIndexColor(score: number): string {
  // Higher score = better (green), lower score = worse (red)
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

export function HeroMetrics({
  currentValue,
  potentialValue,
  valueGap,
  briScore,
  multiple,
  multipleRange,
  industryName,
  coreScore,
  isEstimated = false
}: HeroMetricsProps) {
  const [hoveredCard, setHoveredCard] = useState<HoverState>(null)

  return (
    <div className="pt-1 pb-8 md:pb-12">
      {/* Two-column layout: Market Value on left, 4 metrics on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Primary KPI - Estimated Market Value (or description on hover) */}
        <div className="flex items-center justify-center p-8 md:p-12 rounded-xl bg-[#3D3D3D] shadow-lg transition-all duration-300">
          {hoveredCard ? (
            <div className="text-center">
              <p className="text-sm font-medium text-[#B87333] uppercase tracking-wide mb-3">
                {descriptions[hoveredCard].title}
              </p>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                {descriptions[hoveredCard].description}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-1">
                Estimated Market Value Today
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight">
                {formatCurrency(currentValue)}
              </h1>
              {isEstimated && (
                <p className="text-xs text-[#B87333] mt-3">
                  Based on estimated EBITDA
                  <br />
                  Complete assessment to see risk-adjusted value
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: 2x2 grid of secondary KPIs */}
        <div className="grid grid-cols-2 gap-4">
          {/* Value Gap */}
          <div
            className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 ${
              hoveredCard === 'valueGap' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
            }`}
            onMouseEnter={() => setHoveredCard('valueGap')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Value Gap
            </p>
            <p className="text-2xl md:text-3xl font-semibold text-[#3D3D3D]">
              {formatCurrency(valueGap)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max EV: {formatCurrency(potentialValue)}
            </p>
          </div>

          {/* BRI */}
          <div
            className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 ${
              hoveredCard === 'bri' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
            }`}
            onMouseEnter={() => setHoveredCard('bri')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Buyer Readiness Index
            </p>
            {briScore !== null ? (
              <>
                <p className={`text-2xl md:text-3xl font-semibold ${getBriColor(briScore)}`}>
                  {briScore}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scale: 0 - 100
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-semibold text-gray-400">
                  --
                </p>
                <p className="text-xs text-[#B87333] mt-1">
                  Complete assessment
                </p>
              </>
            )}
          </div>

          {/* Core Index */}
          <div
            className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 ${
              hoveredCard === 'coreIndex' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
            }`}
            onMouseEnter={() => setHoveredCard('coreIndex')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Core Index
            </p>
            {coreScore !== null ? (
              <>
                <p className={`text-2xl md:text-3xl font-semibold ${getCoreIndexColor(coreScore)}`}>
                  {coreScore}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scale: 0 - 100
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-semibold text-gray-400">
                  --
                </p>
                <p className="text-xs text-[#B87333] mt-1">
                  Complete assessment
                </p>
              </>
            )}
          </div>

          {/* EBITDA Multiple */}
          <div
            className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 ${
              hoveredCard === 'multiple' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
            }`}
            onMouseEnter={() => setHoveredCard('multiple')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              EBITDA Multiple
            </p>
            <p className="text-2xl md:text-3xl font-semibold text-[#3D3D3D]">
              {multiple.toFixed(1)}x
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {multipleRange.low.toFixed(1)}x - {multipleRange.high.toFixed(1)}x
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
