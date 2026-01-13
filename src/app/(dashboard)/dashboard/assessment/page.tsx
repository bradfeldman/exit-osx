import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard'

export default async function AssessmentPage() {
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

  return (
    <div className="max-w-3xl mx-auto">
      <AssessmentWizard companyId={company.id} companyName={company.name} />
    </div>
  )
}
