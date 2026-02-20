import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isExternalAdvisor } from '@/lib/auth/check-granular-permission'
import styles from '@/components/advisor/advisor.module.css'

export default async function AdvisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  })

  if (!user) {
    redirect('/login')
  }

  // Check if user is an advisor
  const isAdvisor = await isExternalAdvisor(user.id)

  if (!isAdvisor) {
    // Redirect to regular dashboard if not an advisor
    redirect('/dashboard')
  }

  return (
    <div className={styles.shell}>
      {children}
    </div>
  )
}
