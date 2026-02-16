'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils/currency'

interface ReportData {
  companyName: string
  industry: string | null
  briScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  categoryScores: Array<{ category: string; score: number }>
  topTasks: Array<{
    title: string
    description: string
    category: string
    estimatedValue: number
  }>
  generatedAt: string
}

function getBriLabel(score: number) {
  if (score >= 80) return { label: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' }
  if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' }
  if (score >= 40) return { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' }
  return { label: 'Needs Work', color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' }
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    'Financial': '💰',
    'Transferability': '🔄',
    'Operational': '⚙️',
    'Market': '📊',
    'Legal & Tax': '⚖️',
    'Personal': '👤',
  }
  return icons[category] || '📋'
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/report/${token}`)
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || 'Failed to load report')
        }
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    if (token) loadReport()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Report Not Available</h1>
          <p className="text-sm text-slate-500 mb-6">{error || 'This report link is invalid or has expired.'}</p>
          <a
            href="https://exitosx.com"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Learn about Exit OSx
          </a>
        </div>
      </div>
    )
  }

  const bri = getBriLabel(data.briScore)
  const strengths = data.categoryScores.filter(c => c.score >= 60).sort((a, b) => b.score - a.score)
  const risks = data.categoryScores.filter(c => c.score < 60).sort((a, b) => a.score - b.score)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.webp" alt="Exit OSx" width={28} height={28} className="h-7 w-7" />
            <span className="text-lg font-semibold text-slate-900">
              Exit OS<span className="text-[#B87333]">x</span>
            </span>
          </div>
          <span className="text-xs text-slate-400">Exit Readiness Report</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-8 text-white text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Exit Readiness Report</p>
          <h1 className="text-2xl font-bold mb-1">{data.companyName}</h1>
          {data.industry && (
            <p className="text-sm text-slate-400 mb-6">{data.industry}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Estimated Value</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(data.currentValue)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Potential Value</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">{formatCurrency(data.potentialValue)}</p>
            </div>
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
              <p className="text-xs text-amber-300 uppercase tracking-wide">Value Gap</p>
              <p className="text-2xl font-bold mt-1 text-amber-300">{formatCurrency(data.valueGap)}</p>
            </div>
          </div>
        </div>

        {/* BRI Score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Buyer Readiness Index</h2>
              <p className="text-xs text-slate-500 mt-0.5">How attractive this business is to potential buyers</p>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-bold ${bri.color}`}>{data.briScore}</span>
              <span className="text-lg text-slate-400">/100</span>
              <p className={`text-xs font-semibold ${bri.color} mt-0.5`}>{bri.label}</p>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${bri.bar} rounded-full transition-all duration-700`}
              style={{ width: `${data.briScore}%` }}
            />
          </div>
        </div>

        {/* Category Breakdown: The Good, The Bad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-emerald-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Strengths
            </h3>
            {strengths.length === 0 ? (
              <p className="text-sm text-slate-400">No areas scoring above 60 yet</p>
            ) : (
              <div className="space-y-3">
                {strengths.map(cat => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-700">
                        {getCategoryIcon(cat.category)} {cat.category}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">{cat.score}</span>
                    </div>
                    <div className="h-2 bg-emerald-50 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cat.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risks */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Areas to Improve
            </h3>
            {risks.length === 0 ? (
              <p className="text-sm text-slate-400">All areas scoring above 60</p>
            ) : (
              <div className="space-y-3">
                {risks.map(cat => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-700">
                        {getCategoryIcon(cat.category)} {cat.category}
                      </span>
                      <span className="text-sm font-semibold text-red-600">{cat.score}</span>
                    </div>
                    <div className="h-2 bg-red-50 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${cat.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Priority Actions */}
        {data.topTasks.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Priority Actions</h3>
            <div className="space-y-3">
              {data.topTasks.map((task, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#B87333] text-white text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    {task.estimatedValue > 0 && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Potential impact: {formatCurrency(task.estimatedValue)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#B87333]/10 to-[#B87333]/5 border-2 border-[#B87333]/20 rounded-2xl p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Ready to close the value gap?
          </h3>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
            Exit OSx helps business owners systematically increase their company&apos;s value and prepare for a successful exit.
          </p>
          <a
            href="https://exitosx.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B87333] text-white text-sm font-semibold rounded-xl hover:bg-[#A0632D] transition-colors shadow-lg shadow-[#B87333]/20"
          >
            Get Started Free
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-4">
          <p>Generated {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} Exit OSx. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}
