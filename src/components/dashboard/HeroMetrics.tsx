'use client'

import { useState } from 'react'
import Link from 'next/link'

interface HeroMetricsProps {
  currentValue: number
  potentialValue: number
  valueGap: number
  briScore: number | null
  coreScore: number | null
  personalReadinessScore: number
  isEstimated?: boolean
  isPreviewMode?: boolean
  isAbovePotential?: boolean
}

type HoverState = null | 'valueGap' | 'bri' | 'coreIndex' | 'personalReadiness'

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
  personalReadiness: {
    title: "Personal Readiness",
    description: "Measures your personal preparedness to exit: clarity on timeline, separation of personal and business assets, and key employee awareness of transition plans.",
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
  coreScore,
  personalReadinessScore,
  isEstimated = false,
  isPreviewMode = false,
  isAbovePotential = false
}: HeroMetricsProps) {
  const [hoveredCard, setHoveredCard] = useState<HoverState>(null)

  return (
    <div className="pt-1 pb-8 md:pb-12">
      {/* Two-column layout: Market Value on left, 4 metrics on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Primary KPI - Estimated Market Value (or description on hover) */}
        <div className={`flex items-center justify-center p-8 md:p-12 rounded-xl shadow-lg transition-all duration-300 ${
          isAbovePotential ? 'bg-amber-600 ring-4 ring-amber-500/30' :
          isPreviewMode ? 'bg-[#B87333] ring-4 ring-[#B87333]/30' : 'bg-[#3D3D3D]'
        }`}>
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
              <p className={`text-sm font-medium uppercase tracking-wide mb-1 ${
                isPreviewMode ? 'text-white' : 'text-gray-300'
              }`}>
                {isAbovePotential ? 'Above Your Potential' : isPreviewMode ? 'Preview: Market Value' : 'Estimated Market Value Today'}
              </p>
              {!isPreviewMode && (
                <p className="text-xs text-gray-400 mb-3">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {isPreviewMode && !isAbovePotential && (
                <p className="text-xs text-white/70 mb-3">
                  Based on selected multiple
                </p>
              )}
              {isAbovePotential && (
                <p className="text-xs text-white/90 mb-3">
                  Requires higher Core Index to achieve
                </p>
              )}
              <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight transition-all ${
                isPreviewMode ? 'text-white scale-105' : 'text-white'
              }`}>
                {formatCurrency(currentValue)}
              </h1>
              {isEstimated && !isPreviewMode && (
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
            } ${isAbovePotential ? 'ring-2 ring-amber-500/50' : isPreviewMode ? 'ring-2 ring-[#B87333]/50' : ''}`}
            onMouseEnter={() => setHoveredCard('valueGap')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {isAbovePotential ? 'Exceeds Potential' : isPreviewMode ? 'Preview: Value Gap' : 'Value Gap'}
            </p>
            <p className={`text-2xl md:text-3xl font-semibold transition-all ${
              isAbovePotential ? 'text-amber-600' : isPreviewMode ? 'text-[#B87333]' : 'text-[#3D3D3D]'
            }`}>
              {valueGap < 0 ? `+${formatCurrency(Math.abs(valueGap))}` : formatCurrency(valueGap)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAbovePotential ? 'Above max for Core Index' : `Max EV: ${formatCurrency(potentialValue)}`}
            </p>
          </div>

          {/* BRI */}
          <div
            className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 ${
              hoveredCard === 'bri' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
            } ${isPreviewMode ? 'opacity-60' : ''}`}
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
                  {isPreviewMode ? 'Assessment-based' : 'Scale: 0 - 100'}
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
          <Link href="/dashboard/assessment/company">
            <div
              className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 hover:shadow-md ${
                hoveredCard === 'coreIndex' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
              } ${isPreviewMode ? 'opacity-60' : ''}`}
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
          </Link>

          {/* Personal Readiness */}
          <Link href="/dashboard/assessment/personal-readiness">
            <div
              className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-200 hover:shadow-md ${
                hoveredCard === 'personalReadiness' ? 'border-[#B87333] shadow-md' : 'border-gray-100'
              } ${isPreviewMode ? 'opacity-60' : ''}`}
              onMouseEnter={() => setHoveredCard('personalReadiness')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Personal Readiness
              </p>
              <p className={`text-2xl md:text-3xl font-semibold ${getBriColor(personalReadinessScore)}`}>
                {personalReadinessScore}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Scale: 0 - 100
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
