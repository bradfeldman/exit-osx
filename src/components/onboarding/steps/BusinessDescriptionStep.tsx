'use client'

import { useState } from 'react'
import { motion } from '@/lib/motion'
import { Building2, Lightbulb } from 'lucide-react'

interface BusinessDescriptionStepProps {
  companyName: string
  businessDescription: string
  onDescriptionChange: (description: string) => void
}

const EXAMPLES = [
  "I run a 10-seat ramen shop with 2 part-time staff. Lunch and dinner, no delivery. Using Square for payments.",
  "Family-owned Italian restaurant, 15 years in business. 20 employees, full bar, we do catering on weekends.",
  "Fast-casual taco spot, opened 2 years ago. 8 employees, delivery through DoorDash and UberEats, Toast POS.",
  "Neighborhood coffee shop with small bakery. Just me and 3 baristas. We're open 6am-3pm daily.",
]

export function BusinessDescriptionStep({
  companyName,
  businessDescription,
  onDescriptionChange,
}: BusinessDescriptionStepProps) {
  const [showExamples, setShowExamples] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <Building2 className="w-7 h-7 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground font-display">
          Tell us about {companyName}
        </h2>
        <p className="text-muted-foreground mt-2">
          In a few sentences, describe what your business does, how many people work there, and what makes it unique.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={businessDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe your business..."
            className="w-full h-40 px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {businessDescription.length} / 500
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Lightbulb className="w-4 h-4" />
          {showExamples ? 'Hide examples' : 'Show me examples'}
        </button>

        {showExamples && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Example descriptions:
            </p>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onDescriptionChange(example)}
                  className="w-full text-left p-3 bg-muted/50 hover:bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  &ldquo;{example}&rdquo;
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          This helps us personalize your improvement plan. The more detail, the better.
        </p>
      </div>
    </div>
  )
}
