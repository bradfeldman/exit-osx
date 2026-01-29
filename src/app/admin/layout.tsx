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

  // Detect admin auth routes by checking the URL patterns
  const isAuthRoute = pathname === '/admin/login' ||
    pathname === '/admin/forgot-password' ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/forgot-password')

  // For auth routes, just render the children without the admin layout
  if (isAuthRoute) {
    return <>{children}</>
  }

  const user = await getAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

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
