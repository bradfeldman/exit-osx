import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PlaybookContent } from '@/components/playbook/PlaybookContent'

export default async function PlaybookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's company
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      organizations: {
        include: {
          organization: {
            include: {
              companies: {
                take: 1,
                include: {
                  valuationSnapshots: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const company = dbUser?.organizations[0]?.organization?.companies[0]

  if (!company) {
    redirect('/dashboard/company/setup')
  }

  const hasAssessment = company.valuationSnapshots.length > 0

  if (!hasAssessment) {
    redirect('/dashboard/assessment')
  }

  return (
    <PlaybookContent
      companyId={company.id}
      companyName={company.name}
      valueGap={Number(company.valuationSnapshots[0].valueGap)}
    />
  )
}
