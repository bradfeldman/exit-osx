import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAdminUser, getImpersonationContext } from '@/lib/admin'
import { AdminLayout } from '@/components/admin/AdminLayout'

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if this is an admin auth route (login/forgot-password)
  // These routes should bypass the admin layout authentication
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const referer = headersList.get('referer') || ''
  const url = headersList.get('x-url') || ''

  // Detect admin auth routes by checking multiple sources
  const isAuthRoute = pathname.includes('/admin/login') ||
    pathname.includes('/admin/forgot-password') ||
    referer.includes('/admin/login') ||
    referer.includes('/admin/forgot-password') ||
    url.includes('/admin/login') ||
    url.includes('/admin/forgot-password')

  // For auth routes, just render the children without the admin layout
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Try to get admin user, handle errors gracefully
  let user
  try {
    user = await getAdminUser()
  } catch (error) {
    console.error('Error getting admin user:', error)
    redirect('/admin/login')
  }

  if (!user) {
    redirect('/admin/login')
  }

  let impersonation = null
  try {
    impersonation = await getImpersonationContext()
  } catch (error) {
    console.error('Error getting impersonation context:', error)
  }

  return (
    <AdminLayout
      user={{ email: user.email, name: user.name }}
      impersonation={impersonation}
    >
      {children}
    </AdminLayout>
  )
}
