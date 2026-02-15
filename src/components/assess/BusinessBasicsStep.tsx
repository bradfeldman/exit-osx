'use client'

import { useState } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'

export interface BusinessBasicsData {
  email: string
  companyName: string
  businessDescription: string
  annualRevenue: number
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

interface BusinessBasicsStepProps {
  initialData: BusinessBasicsData | null
  onComplete: (data: BusinessBasicsData) => void
}

export function BusinessBasicsStep({ initialData, onComplete }: BusinessBasicsStepProps) {
  const [email, setEmail] = useState(initialData?.email || '')
  const [companyName, setCompanyName] = useState(initialData?.companyName || '')
  const [businessDescription, setBusinessDescription] = useState(initialData?.businessDescription || '')
  const [annualRevenue, setAnnualRevenue] = useState(initialData?.annualRevenue || 0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    if (!businessDescription.trim() || businessDescription.trim().length < 10) {
      newErrors.businessDescription = 'Please describe your business (at least 10 characters)'
    }
    if (annualRevenue <= 0) {
      newErrors.annualRevenue = 'Please enter your annual revenue'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onComplete({ email, companyName, businessDescription, annualRevenue })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Let&apos;s start with the basics
        </h2>
        <p className="text-muted-foreground mt-2">
          Takes about 90 seconds. Your data is private.
        </p>
      </div>

      <div className="space-y-5">
        {/* Email - first field per board directive */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })) }}
            className="h-12"
            autoComplete="email"
            autoFocus
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          <p className="text-xs text-muted-foreground">We&apos;ll use this to save your results.</p>
        </div>

        {/* Company Name */}
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            type="text"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => { setCompanyName(e.target.value); setErrors(prev => ({ ...prev, companyName: '' })) }}
            className="h-12"
            autoComplete="organization"
          />
          {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
        </div>

        {/* Business Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">What does your business do?</Label>
          <textarea
            id="description"
            placeholder="e.g., We manufacture custom HVAC systems for commercial buildings in the Southeast..."
            value={businessDescription}
            onChange={(e) => { setBusinessDescription(e.target.value); setErrors(prev => ({ ...prev, businessDescription: '' })) }}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          {errors.businessDescription && <p className="text-sm text-red-500">{errors.businessDescription}</p>}
        </div>

        {/* Annual Revenue - Hero style */}
        <div className="space-y-1.5">
          <Label>Annual Revenue</Label>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative p-5 bg-gradient-to-br from-card via-card to-muted/30 rounded-xl border border-border/50"
          >
            {annualRevenue > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            )}
            <div className="relative flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-primary/60">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={annualRevenue > 0 ? annualRevenue.toLocaleString() : ''}
                onChange={(e) => { setAnnualRevenue(parseCurrency(e.target.value)); setErrors(prev => ({ ...prev, annualRevenue: '' })) }}
                placeholder="0"
                className="flex-1 text-3xl sm:text-4xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/20 tracking-tight"
              />
            </div>
          </motion.div>
          {errors.annualRevenue && <p className="text-sm text-red-500">{errors.annualRevenue}</p>}
          <p className="text-xs text-muted-foreground">
            Approximate is fine. This anchors your valuation range.
          </p>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full h-12 text-base font-medium">
        Continue
        <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </form>
  )
}
