'use client'

import { DollarSign, Shield, Users, Clock, Target, ListChecks } from 'lucide-react'

const SUGGESTED_PROMPTS = [
  {
    icon: DollarSign,
    label: 'Valuation',
    prompt: 'What is my current valuation and how can I improve it?',
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: Shield,
    label: 'Risk',
    prompt: "What's my biggest risk right now and how do I address it?",
    color: 'text-red-600 bg-red-50',
  },
  {
    icon: Users,
    label: 'Buyers',
    prompt: 'What type of buyer would be most interested in my business?',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Clock,
    label: 'Timeline',
    prompt: 'How long will it take me to be ready for an exit?',
    color: 'text-orange-600 bg-orange-50',
  },
  {
    icon: Target,
    label: 'Strategy',
    prompt: 'What should I focus on this month to increase my business value?',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    icon: ListChecks,
    label: 'Tasks',
    prompt: 'Which of my pending tasks will have the biggest impact on valuation?',
    color: 'text-teal-600 bg-teal-50',
  },
]

interface CoachSuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

export function CoachSuggestedPrompts({ onSelect }: CoachSuggestedPromptsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl">
      {SUGGESTED_PROMPTS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            onClick={() => onSelect(item.prompt)}
            className="flex items-start gap-3 rounded-xl border border-border p-3.5 text-left hover:border-primary/40 hover:bg-muted/50 transition-colors group"
          >
            <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.prompt}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
