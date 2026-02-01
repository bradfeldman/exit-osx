'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
} from 'lucide-react'

interface ParsedPerson {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  title: string | null
  company: string | null
  linkedInUrl: string | null
  confidence: number
  source: string
}

interface ParsedCompany {
  name: string
  domain: string | null
  website: string | null
  linkedInUrl: string | null
  confidence: number
  source: string
}

interface MatchResult {
  input: ParsedPerson | ParsedCompany
  match: {
    bestMatch: { id: string; name?: string; firstName?: string; lastName?: string; email?: string } | null
    confidence: number
    suggestedAction: 'AUTO_LINK' | 'SUGGEST' | 'PROVISIONAL' | 'CREATE_NEW'
    matchReasons: string[]
  }
}

interface ParseResponse {
  parsed: {
    people: ParsedPerson[]
    companies: ParsedCompany[]
    emails: string[]
    phones: string[]
    linkedInUrls: string[]
    domains: string[]
  }
  matches: {
    companies: MatchResult[]
    people: MatchResult[]
  }
  summary: {
    peopleFound: number
    companiesFound: number
    emailsFound: number
    phonesFound: number
    linkedInUrlsFound: number
    potentialDuplicates: number
  }
}

interface SmartImportProps {
  onImportComplete?: () => void
}

const actionColors = {
  AUTO_LINK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  SUGGEST: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PROVISIONAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CREATE_NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
}

const actionLabels = {
  AUTO_LINK: 'Auto-Link',
  SUGGEST: 'Suggested Match',
  PROVISIONAL: 'Needs Review',
  CREATE_NEW: 'New Record',
}

export function SmartImport({ onImportComplete }: SmartImportProps) {
  const [input, setInput] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())

  const handleParse = async () => {
    if (!input.trim()) {
      toast.error('Please enter some text to parse')
      return
    }

    setIsParsing(true)
    setParseResult(null)

    try {
      const res = await fetch('/api/canonical/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, includeMatches: true }),
      })

      if (res.ok) {
        const data = await res.json()
        setParseResult(data)
        toast.success(`Found ${data.summary.peopleFound} people and ${data.summary.companiesFound} companies`)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to parse input')
      }
    } catch (error) {
      console.error('Parse error:', error)
      toast.error('Failed to parse input')
    } finally {
      setIsParsing(false)
    }
  }

  const handleImportCompany = async (company: ParsedCompany, matchResult: MatchResult['match']) => {
    const key = `company-${company.name}`
    if (importedIds.has(key)) return

    setIsImporting(true)
    try {
      if (matchResult.suggestedAction === 'AUTO_LINK' && matchResult.bestMatch) {
        // Already exists, just mark as imported
        setImportedIds(new Set([...importedIds, key]))
        toast.success(`Linked to existing company: ${matchResult.bestMatch.name}`)
        return
      }

      const res = await fetch('/api/canonical/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: company.name,
          website: company.website,
          linkedInUrl: company.linkedInUrl,
          domains: company.domain ? [company.domain] : [],
          skipDuplicateCheck: matchResult.suggestedAction === 'CREATE_NEW',
        }),
      })

      if (res.ok) {
        setImportedIds(new Set([...importedIds, key]))
        toast.success(`Created company: ${company.name}`)
      } else if (res.status === 409) {
        // Duplicate warning - already handled in SUGGEST case
        toast.error('Potential duplicate detected. Review before creating.')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create company')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import company')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportPerson = async (person: ParsedPerson, matchResult: MatchResult['match']) => {
    const key = `person-${person.email || `${person.firstName}-${person.lastName}`}`
    if (importedIds.has(key)) return

    setIsImporting(true)
    try {
      if (matchResult.suggestedAction === 'AUTO_LINK' && matchResult.bestMatch) {
        setImportedIds(new Set([...importedIds, key]))
        toast.success(`Linked to existing person: ${matchResult.bestMatch.firstName} ${matchResult.bestMatch.lastName}`)
        return
      }

      const res = await fetch('/api/canonical/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          phone: person.phone,
          linkedInUrl: person.linkedInUrl,
          currentTitle: person.title,
          currentCompanyName: person.company,
          skipDuplicateCheck: matchResult.suggestedAction === 'CREATE_NEW',
        }),
      })

      if (res.ok) {
        setImportedIds(new Set([...importedIds, key]))
        toast.success(`Created person: ${person.firstName} ${person.lastName}`)
      } else if (res.status === 409) {
        toast.error('Potential duplicate detected. Review before creating.')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create person')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import person')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportAll = async () => {
    if (!parseResult) return

    setIsImporting(true)
    let imported = 0

    // Import companies first
    for (const match of parseResult.matches.companies) {
      const company = match.input as ParsedCompany
      if (match.match.suggestedAction === 'CREATE_NEW' || match.match.suggestedAction === 'PROVISIONAL') {
        await handleImportCompany(company, match.match)
        imported++
      }
    }

    // Then import people
    for (const match of parseResult.matches.people) {
      const person = match.input as ParsedPerson
      if (match.match.suggestedAction === 'CREATE_NEW' || match.match.suggestedAction === 'PROVISIONAL') {
        await handleImportPerson(person, match.match)
        imported++
      }
    }

    setIsImporting(false)
    if (imported > 0) {
      toast.success(`Imported ${imported} records`)
      onImportComplete?.()
    }
  }

  const handleClear = () => {
    setInput('')
    setParseResult(null)
    setImportedIds(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Contact Parser
          </CardTitle>
          <CardDescription>
            Paste contact information in any format - emails, vCards, CSV, or plain text.
            Our AI will extract and match against existing records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Paste contacts here. Examples:\n\nJohn Smith\njohn@acmecorp.com\nVP of Sales\n+1 (555) 123-4567\n\nOr CSV format:\nName,Email,Company,Title\nJane Doe,jane@example.com,Example Inc,CEO`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={isParsing || !input.trim()}>
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse Contacts
                </>
              )}
            </Button>
            {parseResult && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {parseResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parse Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{parseResult.summary.peopleFound}</p>
                  <p className="text-sm text-muted-foreground">People</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{parseResult.summary.companiesFound}</p>
                  <p className="text-sm text-muted-foreground">Companies</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{parseResult.summary.emailsFound}</p>
                  <p className="text-sm text-muted-foreground">Emails</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{parseResult.summary.phonesFound}</p>
                  <p className="text-sm text-muted-foreground">Phones</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{parseResult.summary.potentialDuplicates}</p>
                  <p className="text-sm text-muted-foreground">Potential Matches</p>
                </div>
              </div>
              {parseResult.matches.companies.length + parseResult.matches.people.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleImportAll} disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Import All New Records
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Companies */}
          {parseResult.matches.companies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Companies ({parseResult.matches.companies.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parseResult.matches.companies.map((match, idx) => {
                    const company = match.input as ParsedCompany
                    const key = `company-${company.name}`
                    const isImported = importedIds.has(key)

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between p-4 border rounded-lg',
                          isImported && 'bg-green-50 dark:bg-green-950/20 border-green-200'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{company.name}</p>
                            <Badge className={cn('text-xs', actionColors[match.match.suggestedAction])}>
                              {actionLabels[match.match.suggestedAction]}
                            </Badge>
                            {match.match.confidence > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(match.match.confidence * 100)}% match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            {company.website && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {company.website}
                              </span>
                            )}
                            {company.domain && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {company.domain}
                              </span>
                            )}
                            {company.linkedInUrl && (
                              <span className="flex items-center gap-1">
                                <Linkedin className="h-3 w-3" />
                                LinkedIn
                              </span>
                            )}
                          </div>
                          {match.match.bestMatch && (
                            <div className="mt-2 text-sm flex items-center gap-2">
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-muted-foreground">Matches:</span>
                              <span className="font-medium">{match.match.bestMatch.name}</span>
                            </div>
                          )}
                          {match.match.matchReasons.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {match.match.matchReasons.map((reason, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {isImported ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : match.match.suggestedAction === 'AUTO_LINK' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Button
                              size="sm"
                              variant={match.match.suggestedAction === 'SUGGEST' ? 'outline' : 'default'}
                              onClick={() => handleImportCompany(company, match.match)}
                              disabled={isImporting}
                            >
                              {match.match.suggestedAction === 'SUGGEST' ? (
                                <>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Create Anyway
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* People */}
          {parseResult.matches.people.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  People ({parseResult.matches.people.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parseResult.matches.people.map((match, idx) => {
                    const person = match.input as ParsedPerson
                    const key = `person-${person.email || `${person.firstName}-${person.lastName}`}`
                    const isImported = importedIds.has(key)

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between p-4 border rounded-lg',
                          isImported && 'bg-green-50 dark:bg-green-950/20 border-green-200'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {person.firstName} {person.lastName}
                            </p>
                            <Badge className={cn('text-xs', actionColors[match.match.suggestedAction])}>
                              {actionLabels[match.match.suggestedAction]}
                            </Badge>
                            {match.match.confidence > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(match.match.confidence * 100)}% match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            {person.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {person.email}
                              </span>
                            )}
                            {person.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {person.phone}
                              </span>
                            )}
                            {person.title && (
                              <span>{person.title}</span>
                            )}
                            {person.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {person.company}
                              </span>
                            )}
                          </div>
                          {match.match.bestMatch && (
                            <div className="mt-2 text-sm flex items-center gap-2">
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-muted-foreground">Matches:</span>
                              <span className="font-medium">
                                {match.match.bestMatch.firstName} {match.match.bestMatch.lastName}
                              </span>
                              {match.match.bestMatch.email && (
                                <span className="text-muted-foreground">({match.match.bestMatch.email})</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {isImported ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : match.match.suggestedAction === 'AUTO_LINK' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Button
                              size="sm"
                              variant={match.match.suggestedAction === 'SUGGEST' ? 'outline' : 'default'}
                              onClick={() => handleImportPerson(person, match.match)}
                              disabled={isImporting}
                            >
                              {match.match.suggestedAction === 'SUGGEST' ? (
                                <>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Create Anyway
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
