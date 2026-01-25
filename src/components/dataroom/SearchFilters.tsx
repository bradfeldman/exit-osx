'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CATEGORY_INFO } from '@/lib/dataroom/constants'

interface Tag {
  id: string
  name: string
  color: string
}

interface SearchFiltersProps {
  companyId: string
  onFiltersChange: (filters: FilterState) => void
  initialFilters?: Partial<FilterState>
}

export interface FilterState {
  search: string
  status: string
  category: string
  hasFile: string
  tags: string[]
  updatedAfter: string
  updatedBefore: string
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: '',
  category: '',
  hasFile: '',
  tags: [],
  updatedAfter: '',
  updatedBefore: '',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'CURRENT', label: 'Current' },
  { value: 'NEEDS_UPDATE', label: 'Needs Update' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const FILE_OPTIONS = [
  { value: '', label: 'All Documents' },
  { value: 'true', label: 'With Files' },
  { value: 'false', label: 'Missing Files' },
]

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
]

export function SearchFilters({
  companyId,
  onFiltersChange,
  initialFilters,
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })
  const [tags, setTags] = useState<Tag[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null)

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/dataroom/tags`)
        if (res.ok) {
          const data = await res.json()
          setTags(data.tags || [])
        }
      } catch (error) {
        console.error('Error fetching tags:', error)
      }
    }
    fetchTags()
  }, [companyId])

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))

    if (searchDebounce) {
      clearTimeout(searchDebounce)
    }

    const timeout = setTimeout(() => {
      onFiltersChange({ ...filters, search: value })
    }, 300)

    setSearchDebounce(timeout)
  }, [filters, onFiltersChange, searchDebounce])

  const handleFilterChange = useCallback((key: keyof FilterState, value: string | string[]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }, [filters, onFiltersChange])

  const handleDatePreset = useCallback((days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    const newFilters = {
      ...filters,
      updatedAfter: date.toISOString().split('T')[0],
      updatedBefore: '',
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }, [filters, onFiltersChange])

  const handleTagToggle = useCallback((tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId]
    handleFilterChange('tags', newTags)
  }, [filters.tags, handleFilterChange])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    onFiltersChange(DEFAULT_FILTERS)
  }, [onFiltersChange])

  const activeFilterCount = [
    filters.status,
    filters.category,
    filters.hasFile,
    filters.tags.length > 0 ? 'tags' : '',
    filters.updatedAfter,
    filters.updatedBefore,
  ].filter(Boolean).length

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...Object.entries(CATEGORY_INFO).map(([key, info]) => ({
      value: key,
      label: info.label,
    })),
  ]

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick filters */}
        <Select
          value={filters.status}
          onValueChange={(v) => handleFilterChange('status', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(v) => handleFilterChange('category', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced filters toggle */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <FilterIcon className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Advanced Filters</h4>

              {/* File status */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">File Status</label>
                <Select
                  value={filters.hasFile}
                  onValueChange={(v) => handleFilterChange('hasFile', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Documents" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Last Updated</label>
                <div className="flex flex-wrap gap-2">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.days}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleDatePreset(preset.days)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={filters.updatedAfter}
                      onChange={(e) => handleFilterChange('updatedAfter', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={filters.updatedBefore}
                      onChange={(e) => handleFilterChange('updatedBefore', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          filters.tags.includes(tag.id)
                            ? 'ring-2 ring-offset-1'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: tag.color + '30',
                          color: tag.color,
                          borderColor: tag.color,
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear button */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear button when filters active */}
        {(filters.search || activeFilterCount > 0) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {filters.status && (
            <FilterBadge
              label={`Status: ${STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}`}
              onRemove={() => handleFilterChange('status', '')}
            />
          )}

          {filters.category && (
            <FilterBadge
              label={`Category: ${CATEGORY_INFO[filters.category as keyof typeof CATEGORY_INFO]?.label || filters.category}`}
              onRemove={() => handleFilterChange('category', '')}
            />
          )}

          {filters.hasFile && (
            <FilterBadge
              label={FILE_OPTIONS.find((o) => o.value === filters.hasFile)?.label || ''}
              onRemove={() => handleFilterChange('hasFile', '')}
            />
          )}

          {filters.updatedAfter && (
            <FilterBadge
              label={`After: ${filters.updatedAfter}`}
              onRemove={() => handleFilterChange('updatedAfter', '')}
            />
          )}

          {filters.updatedBefore && (
            <FilterBadge
              label={`Before: ${filters.updatedBefore}`}
              onRemove={() => handleFilterChange('updatedBefore', '')}
            />
          )}

          {filters.tags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId)
            return tag ? (
              <FilterBadge
                key={tagId}
                label={tag.name}
                color={tag.color}
                onRemove={() => handleTagToggle(tagId)}
              />
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

function FilterBadge({
  label,
  color,
  onRemove,
}: {
  label: string
  color?: string
  onRemove: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100"
      style={color ? { backgroundColor: color + '20', color } : undefined}
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-black/10 rounded-full p-0.5"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  )
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
