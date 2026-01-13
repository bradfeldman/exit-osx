'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CompanyFormData } from '../CompanySetupWizard'

interface AdjustmentsStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

const commonAddBacks = [
  'Owner compensation above market rate',
  'Personal vehicle expenses',
  'Family member salaries (above market)',
  'One-time legal fees',
  'Non-recurring consulting fees',
  'Personal insurance',
  'Personal travel expenses',
  'Charitable contributions',
  'Depreciation',
  'Amortization',
]

const commonDeductions = [
  'Below-market rent (related party)',
  'Unpaid management services',
  'Deferred maintenance',
  'Below-market owner salary',
]

export function AdjustmentsStep({ formData, updateFormData }: AdjustmentsStepProps) {
  const [newDescription, setNewDescription] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newType, setNewType] = useState<'ADD_BACK' | 'DEDUCTION'>('ADD_BACK')

  const handleAddAdjustment = () => {
    if (!newDescription || !newAmount) return

    const adjustment = {
      description: newDescription,
      amount: parseCurrency(newAmount),
      type: newType,
    }

    updateFormData({
      adjustments: [...formData.adjustments, adjustment],
    })

    setNewDescription('')
    setNewAmount('')
    setNewType('ADD_BACK')
  }

  const handleRemoveAdjustment = (index: number) => {
    updateFormData({
      adjustments: formData.adjustments.filter((_, i) => i !== index),
    })
  }

  const handleQuickAdd = (description: string, type: 'ADD_BACK' | 'DEDUCTION') => {
    setNewDescription(description)
    setNewType(type)
  }

  const totalAddBacks = formData.adjustments
    .filter((a) => a.type === 'ADD_BACK')
    .reduce((sum, a) => sum + a.amount, 0)

  const totalDeductions = formData.adjustments
    .filter((a) => a.type === 'DEDUCTION')
    .reduce((sum, a) => sum + a.amount, 0)

  const adjustedEbitda = formData.annualEbitda + totalAddBacks - totalDeductions

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">EBITDA Adjustments</h2>
        <p className="text-sm text-gray-600 mb-6">
          Add-backs and deductions normalize your EBITDA to reflect true operating performance.
          This is optional but helps buyers understand your adjusted earnings.
        </p>
      </div>

      {/* Quick Add Suggestions */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Common Add-Backs</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {commonAddBacks.slice(0, 5).map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(item, 'ADD_BACK')}
                className="text-xs"
              >
                + {item}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Common Deductions</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {commonDeductions.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(item, 'DEDUCTION')}
                className="text-xs"
              >
                + {item}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Adjustment Form */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Add Adjustment</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g., Owner salary above market"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={newType} onValueChange={(v) => setNewType(v as 'ADD_BACK' | 'DEDUCTION')}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADD_BACK">Add-Back</SelectItem>
                <SelectItem value="DEDUCTION">Deduction</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleAddAdjustment}
          disabled={!newDescription || !newAmount}
          className="mt-4"
          size="sm"
        >
          Add Adjustment
        </Button>
      </div>

      {/* Current Adjustments List */}
      {formData.adjustments.length > 0 && (
        <div className="space-y-2">
          <Label>Your Adjustments</Label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
            {formData.adjustments.map((adjustment, index) => (
              <div key={index} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      adjustment.type === 'ADD_BACK'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {adjustment.type === 'ADD_BACK' ? '+' : '-'}
                  </span>
                  <span className="text-sm text-gray-900">{adjustment.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${
                    adjustment.type === 'ADD_BACK' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {adjustment.type === 'ADD_BACK' ? '+' : '-'}{formatCurrency(adjustment.amount)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAdjustment(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="p-4 bg-primary/10 rounded-lg border border-primary">
        <h3 className="text-sm font-medium text-primary mb-3">Adjusted EBITDA Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-primary">Reported EBITDA</span>
            <span className="font-medium text-primary">{formatCurrency(formData.annualEbitda)}</span>
          </div>
          {totalAddBacks > 0 && (
            <div className="flex justify-between">
              <span className="text-green-700">+ Total Add-Backs</span>
              <span className="font-medium text-green-700">{formatCurrency(totalAddBacks)}</span>
            </div>
          )}
          {totalDeductions > 0 && (
            <div className="flex justify-between">
              <span className="text-red-700">- Total Deductions</span>
              <span className="font-medium text-red-700">{formatCurrency(totalDeductions)}</span>
            </div>
          )}
          <div className="border-t border-primary pt-2 flex justify-between">
            <span className="font-medium text-primary">Adjusted EBITDA</span>
            <span className="font-bold text-primary">{formatCurrency(adjustedEbitda)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
