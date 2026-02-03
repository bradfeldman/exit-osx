'use client'

import Link from 'next/link'

export function EntryScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <svg viewBox="0 0 800 200" className="h-12 w-auto" aria-label="Exit OSx">
          <g transform="translate(0.000000,200.000000) scale(0.100000,-0.100000)">
            <path fill="#FFFFFF" d="M2725,1759c-28-28-210-208-406-400l-357-349l-93,140l-94,139h-195c-107,1-201-3-208-7c-9-6,33-74,149-243
              c88-129,168-242,178-252c17-18,19-17,50,9c17,14,33,25,35,23c11-12,36-70,35-81c0-13-41-49-426-382c-106-92-195-171-198-176
              c-4-6,51-10,152-10l158,1l823,819l823,820h-188h-189L2725,1759z"/>
            <path fill="#FFFFFF" d="M317,1683C290,1464,169,198,175,192c3-4,193-9,420-10l413-4l86,84c47,46,86,91,86,101c0,16-23,17-335,17H510
              v23c0,12,9,114,20,227s20,213,20,223c0,16,18,17,239,17c283,0,359,6,365,29c2,9,7,51,11,94l7,77H876H580v23c0,20,21,249,36,385
              l5,52h319h318l7,91c4,49,4,93,0,97s-217,8-474,10l-468,4L317,1683z"/>
            <path fill="#FFFFFF" d="M4715,1580c-284-41-503-258-565-561c-25-119-27-301-4-402c51-228,208-387,439-443c47-12,111-17,195-17
              c376,0,613,176,701,521c25,100,27,390,3,473c-58,196-217,355-414,413C5005,1584,4801,1593,4715,1580z M4997,1370
              c62-26,135-101,163-165c11-25,25-75,31-112c15-85,6-315-16-403c-37-151-132-287-232-333c-40-18-66-22-153-22c-124,0-173,18-238,90
              c-81,87-112,184-112,350c0,340,105,549,310,616C4797,1407,4941,1395,4997,1370z"/>
            <path fill="#FFFFFF" d="M6079,1571c-144-20-284-88-349-171c-53-67-73-126-78-228c-4-88-3-96,27-157c53-108,115-148,351-230
              c248-86,290-118,290-222c0-151-97-210-324-200c-129,5-190,21-319,79c-40,19-71,28-77,22c-4-5-12-49-17-97c-11-105-12-104,110-142
              c115-37,204-48,372-49c115-1,165,3,213,17c158,45,250,114,309,234c36,74,38,80,38,182c0,99-2,110-30,160c-52,94-128,141-360,221
              c-178,62-214,79-248,120c-75,89-23,225,100,261c106,31,310,9,447-48c32-13,62-21,67-16c4,4,9,51,11,103l3,95l-55,17
              C6434,1563,6197,1587,6079,1571z"/>
            <path fill="#FFFFFF" d="M3430,1501c-64-15-123-30-131-33c-12-5-18-29-23-100c-3-51-9-114-13-140l-5-47l-92-3l-91-3l-8-63
              c-13-92-12-92,89-92h87l-7-47c-23-169-56-565-51-606c10-69,58-135,124-169c49-26,62-28,170-28c118,0,224,18,247,43
              c12,12,36,128,28,136c-2,2-29-1-60-8c-108-21-179-8-204,38c-16,30-12,116,15,375c14,131,25,244,25,252c0,11,26,14,134,14h135l6,58
              c3,31,8,67,11,80c4,22,4,22-132,22h-136l6,33c5,28,36,290,36,310C3590,1535,3551,1530,3430,1501z"/>
            <path fill="#FFFFFF" d="M2734,1193l-71-4l-12-122c-7-67-30-288-52-491c-22-204-37-376-35-383c7-17,271-19,281-2c7,10,36,274,86,772
              c12,119,19,220,15,224C2938,1196,2833,1199,2734,1193z"/>
            <path fill="#FFFFFF" d="M6721.4,876.2l-23.8-4.5l121.8-177.5c118.8-173,121.8-178.2,108.4-193.1c-6.7-8.2-74.3-79.5-149.3-158.2
              c-75-78-141.1-149.3-147-157.4c-10.4-15.6-10.4-15.6,106.9-15.6h117.3l89.1,107.7c48.3,59.4,90.6,107.7,93.6,107.7
              c3,0,34.9-48.3,71.3-107.7l65.4-106.9l124-0.7h124.8l-75,109.9c-166.4,242.1-159.7,230.2-147,250.3c5.9,10.4,71.3,81.7,145.6,158.9
              c75,77.2,144.1,150.8,155.2,163.4l19.3,23h-115.9H7291l-76.5-87.6c-42.3-47.5-88.4-101-103.2-118.8l-27.5-31.9L7011,759.7
              l-73.5,122.5l-96.5-0.7C6788.2,881.4,6734,879.2,6721.4,876.2z"/>
            <path fill="#FFFFFF" d="M2028,587l-118-112l102-148l101-147h204c111,0,203,3,202,8c-1,18-347,507-360,509C2151,698,2092,649,2028,587z"/>
          </g>
          <polygon fill="#B87333" points="181.9,126.2 315.1,19 277.4,19 196.2,99 178.4,118.1"/>
        </svg>
      </div>

      {/* Main Content */}
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          See how buyers value your business
        </h1>

        <p className="text-lg text-slate-300">
          Get your personalized business valuation in minutes. Understand your exit options and maximize your company&apos;s worth.
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-primary/25"
          >
            Start Here
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* Value Props */}
        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <ClockIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-1">Quick Assessment</h3>
            <p className="text-sm text-slate-400">Get your initial valuation in under 10 minutes</p>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <ChartIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-1">Buyer&apos;s Perspective</h3>
            <p className="text-sm text-slate-400">See exactly how buyers evaluate your business</p>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <TargetIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-1">Action Plan</h3>
            <p className="text-sm text-slate-400">Get a roadmap to increase your exit value</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-slate-500">
          Exit OSx is a Pasadena Private Financial Group Company
        </p>
      </div>
    </div>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}
