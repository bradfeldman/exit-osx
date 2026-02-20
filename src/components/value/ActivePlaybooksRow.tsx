'use client'

interface ActivePlaybook {
  id: string
  title: string
  percentComplete: number
  category: string
}

interface ActivePlaybooksRowProps {
  playbooks: ActivePlaybook[]
}

const CATEGORY_COLORS: Record<string, string> = {
  FINANCIAL: 'bg-emerald-100 text-emerald-700',
  TRANSFERABILITY: 'bg-blue-100 text-blue-700',
  OPERATIONAL: 'bg-purple-100 text-purple-700',
  MARKET: 'bg-amber-100 text-amber-700',
  LEGAL_TAX: 'bg-red-100 text-red-700',
  PERSONAL: 'bg-gray-100 text-gray-700',
}

export function ActivePlaybooksRow({ playbooks }: ActivePlaybooksRowProps) {
  if (playbooks.length === 0) return null

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Active Playbooks
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
        {playbooks.map((pb) => {
          const circumference = 2 * Math.PI * 18
          const dashOffset = circumference - (circumference * pb.percentComplete / 100)
          const colorClass = CATEGORY_COLORS[pb.category] || CATEGORY_COLORS.PERSONAL

          return (
            <div
              key={pb.id}
              className="bg-card border border-border rounded-xl p-4 min-w-[200px] max-w-[240px] shrink-0 snap-start flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              {/* Progress ring */}
              <div className="relative w-11 h-11 shrink-0">
                <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                  <circle
                    cx="22" cy="22" r="18"
                    fill="none" stroke="#0071E3" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
                  {pb.percentComplete}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{pb.title}</p>
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${colorClass}`}>
                  {pb.category.replace('_', ' ')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
