'use client'

interface BuyerContextBlockProps {
  buyerConsequence: string | null
  buyerRisk: {
    mainQuestion: string
    consequences: string[]
    conclusion: string
  } | null
}

export function BuyerContextBlock({ buyerConsequence, buyerRisk }: BuyerContextBlockProps) {
  const content = buyerConsequence || buyerRisk?.mainQuestion
  if (!content) return null

  return (
    <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/30">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
        WHY THIS MATTERS TO BUYERS
      </p>
      <p className="text-sm text-muted-foreground italic leading-relaxed">
        &ldquo;{content}
        {buyerRisk && !buyerConsequence && buyerRisk.conclusion && (
          <> {buyerRisk.conclusion}</>
        )}
        &rdquo;
      </p>
    </div>
  )
}
