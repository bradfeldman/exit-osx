import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, TrendingUp, Calculator, SlidersHorizontal, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const tools = [
  {
    title: 'BRI Weights',
    description: 'Configure Business Readiness Index category weights for scoring',
    icon: Scale,
    href: '/admin/tools/bri-weights',
  },
  {
    title: 'Industry Multiples',
    description: 'Manage valuation multiples by industry sector',
    icon: TrendingUp,
    href: '/admin/tools/industry-multiples',
  },
  {
    title: 'Multiple Adjustment',
    description: 'Configure adjustments to valuation multiples',
    icon: Calculator,
    href: '/admin/tools/multiple-adjustment',
  },
  {
    title: 'Global BRI Weighting',
    description: 'System-wide BRI configuration and defaults',
    icon: SlidersHorizontal,
    href: '/admin/tools/bri-weighting',
  },
]

export default function VariablesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Variable Management</h1>
        <p className="text-muted-foreground">
          Configure BRI weights, industry multiples, and valuation adjustments
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <SlidersHorizontal className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>System Variables</CardTitle>
              <CardDescription>
                These settings affect valuation calculations and BRI scores across all companies
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tools Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Configuration Tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <tool.icon className="h-8 w-8 text-purple-500" />
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>How Variables Affect Calculations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">BRI Weights</h3>
            <p>
              Define how each category (Financial Health, Growth, Operations, etc.) contributes to the overall
              Business Readiness Index score. Weights must sum to 100%.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Industry Multiples</h3>
            <p>
              Set baseline valuation multiples (revenue, EBITDA, etc.) for each industry sector.
              These form the foundation of company valuations.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Multiple Adjustments</h3>
            <p>
              Configure how various factors (growth rate, profitability, risk) adjust the base
              industry multiple up or down.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Global BRI Weighting</h3>
            <p>
              System-wide settings that affect how BRI scores are calculated and displayed
              across all companies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
