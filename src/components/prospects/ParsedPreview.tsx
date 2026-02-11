'use client'

import { motion } from '@/lib/motion'
import { ParsedInput, ParsedPerson, ParsedCompany } from '@/lib/contact-system/smart-parser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User,
  Building2,
  Mail,
  Phone,
  Linkedin,
  Globe,
  Briefcase,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParsedPreviewProps {
  parsed: ParsedInput
  onPersonChange?: (index: number, person: ParsedPerson) => void
  onCompanyChange?: (index: number, company: ParsedCompany) => void
  editable?: boolean
}

export function ParsedPreview({
  parsed,
  onPersonChange,
  onCompanyChange,
  editable = true,
}: ParsedPreviewProps) {
  const hasPeople = parsed.people.length > 0
  const hasCompanies = parsed.companies.length > 0
  const hasData = hasPeople || hasCompanies

  if (!hasData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No data to preview</p>
        <p className="text-sm mt-1">Enter some contact information above</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* People Section */}
      {hasPeople && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            People ({parsed.people.length})
          </h4>
          <div className="space-y-3">
            {parsed.people.map((person, idx) => (
              <PersonPreviewCard
                key={idx}
                person={person}
                onChange={editable && onPersonChange ? (p) => onPersonChange(idx, p) : undefined}
                editable={editable}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Companies Section */}
      {hasCompanies && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Companies ({parsed.companies.length})
          </h4>
          <div className="space-y-3">
            {parsed.companies.map((company, idx) => (
              <CompanyPreviewCard
                key={idx}
                company={company}
                onChange={editable && onCompanyChange ? (c) => onCompanyChange(idx, c) : undefined}
                editable={editable}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

interface PersonPreviewCardProps {
  person: ParsedPerson
  onChange?: (person: ParsedPerson) => void
  editable: boolean
}

function PersonPreviewCard({ person, onChange, editable }: PersonPreviewCardProps) {
  const confidenceColor =
    person.confidence >= 0.8
      ? 'bg-green-100 text-green-700'
      : person.confidence >= 0.5
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'

  const handleChange = (field: keyof ParsedPerson, value: string) => {
    if (onChange) {
      onChange({ ...person, [field]: value })
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-blue-50/50 dark:bg-blue-950/20 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            {person.fullName || 'Unknown Person'}
          </CardTitle>
          <Badge className={cn('text-[10px]', confidenceColor)}>
            {Math.round(person.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* First Name */}
          <div>
            <Label className="text-xs text-muted-foreground">First Name</Label>
            {editable ? (
              <Input
                value={person.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{person.firstName || '—'}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Label className="text-xs text-muted-foreground">Last Name</Label>
            {editable ? (
              <Input
                value={person.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{person.lastName || '—'}</p>
            )}
          </div>

          {/* Email */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            {editable ? (
              <Input
                value={person.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="h-8 text-sm"
                type="email"
              />
            ) : (
              <p className="text-sm font-medium">{person.email || '—'}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone
            </Label>
            {editable ? (
              <Input
                value={person.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{person.phone || '—'}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Title
            </Label>
            {editable ? (
              <Input
                value={person.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{person.title || '—'}</p>
            )}
          </div>

          {/* Company */}
          {person.company && (
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Company
              </Label>
              {editable ? (
                <Input
                  value={person.company || ''}
                  onChange={(e) => handleChange('company', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm font-medium">{person.company}</p>
              )}
            </div>
          )}

          {/* LinkedIn */}
          {person.linkedInUrl && (
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Linkedin className="h-3 w-3" /> LinkedIn
              </Label>
              <a
                href={person.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate block"
              >
                {person.linkedInUrl}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CompanyPreviewCardProps {
  company: ParsedCompany
  onChange?: (company: ParsedCompany) => void
  editable: boolean
}

function CompanyPreviewCard({ company, onChange, editable }: CompanyPreviewCardProps) {
  const confidenceColor =
    company.confidence >= 0.8
      ? 'bg-green-100 text-green-700'
      : company.confidence >= 0.5
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'

  const sourceLabel = {
    domain: 'From domain',
    text: 'From text',
    linkedin: 'From LinkedIn',
    inferred: 'Inferred',
  }[company.source]

  const handleChange = (field: keyof ParsedCompany, value: string) => {
    if (onChange) {
      onChange({ ...company, [field]: value })
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-purple-50/50 dark:bg-purple-950/20 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-600" />
            {company.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{sourceLabel}</span>
            <Badge className={cn('text-[10px]', confidenceColor)}>
              {Math.round(company.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Company Name */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Company Name</Label>
            {editable ? (
              <Input
                value={company.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{company.name}</p>
            )}
          </div>

          {/* Domain */}
          {(company.domain || editable) && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Domain
              </Label>
              {editable ? (
                <Input
                  value={company.domain || ''}
                  onChange={(e) => handleChange('domain', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm font-medium">{company.domain || '—'}</p>
              )}
            </div>
          )}

          {/* Website */}
          {(company.website || editable) && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Website
              </Label>
              {editable ? (
                <Input
                  value={company.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          )}

          {/* LinkedIn */}
          {company.linkedInUrl && (
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Linkedin className="h-3 w-3" /> LinkedIn
              </Label>
              <a
                href={company.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate block"
              >
                {company.linkedInUrl}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
