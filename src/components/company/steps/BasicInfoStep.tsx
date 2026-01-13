'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { industryData } from '@/lib/data/industries'
import type { CompanyFormData } from '../CompanySetupWizard'

interface BasicInfoStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

export function BasicInfoStep({ formData, updateFormData }: BasicInfoStepProps) {
  const superSectors = formData.icbIndustry
    ? industryData.superSectors[formData.icbIndustry] || []
    : []

  const sectors = formData.icbSuperSector
    ? industryData.sectors[formData.icbSuperSector] || []
    : []

  const subSectors = formData.icbSector
    ? industryData.subSectors[formData.icbSector] || []
    : []

  const handleIndustryChange = (value: string) => {
    updateFormData({
      icbIndustry: value,
      icbSuperSector: '',
      icbSector: '',
      icbSubSector: '',
    })
  }

  const handleSuperSectorChange = (value: string) => {
    updateFormData({
      icbSuperSector: value,
      icbSector: '',
      icbSubSector: '',
    })
  }

  const handleSectorChange = (value: string) => {
    updateFormData({
      icbSector: value,
      icbSubSector: '',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter your company name and select your industry classification. This helps us apply the correct valuation multiples.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="Enter your company name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.icbIndustry} onValueChange={handleIndustryChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {industryData.industries.map((industry) => (
                <SelectItem key={industry.value} value={industry.value}>
                  {industry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.icbIndustry && superSectors.length > 0 && (
          <div>
            <Label htmlFor="superSector">Super Sector</Label>
            <Select value={formData.icbSuperSector} onValueChange={handleSuperSectorChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select super sector" />
              </SelectTrigger>
              <SelectContent>
                {superSectors.map((superSector) => (
                  <SelectItem key={superSector.value} value={superSector.value}>
                    {superSector.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.icbSuperSector && sectors.length > 0 && (
          <div>
            <Label htmlFor="sector">Sector</Label>
            <Select value={formData.icbSector} onValueChange={handleSectorChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector.value} value={sector.value}>
                    {sector.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.icbSector && subSectors.length > 0 && (
          <div>
            <Label htmlFor="subSector">Sub-Sector</Label>
            <Select value={formData.icbSubSector} onValueChange={(value) => updateFormData({ icbSubSector: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sub-sector" />
              </SelectTrigger>
              <SelectContent>
                {subSectors.map((subSector) => (
                  <SelectItem key={subSector.value} value={subSector.value}>
                    {subSector.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
