import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAdminUser, getImpersonationContext } from '@/lib/admin'
import { AdminLayout } from '@/components/admin/AdminLayout'

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAdminUser()

  if (!user) {
    // SECURITY: Clear admin verification cookie if user is not an admin
    const cookieStore = await cookies()
    cookieStore.delete('admin_verified')
    redirect('/dashboard')
  }

  // SECURITY: Set admin verification cookie for middleware defense-in-depth
  // This cookie is checked by middleware before allowing admin API access
  // It has a short expiry and is HttpOnly to prevent client-side access
  const cookieStore = await cookies()
  cookieStore.set('admin_verified', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 15, // 15 minutes - requires re-verification on expiry
    path: '/',
  })

  const impersonation = await getImpersonationContext()

  return (
    <AdminLayout
      user={{ email: user.email, name: user.name }}
      impersonation={impersonation}
    >
      {children}
    </AdminLayout>
  )
}
