/**
 * Admin Layout
 * Separate layout for admin area - only accessible to admin users
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/auth'
import { AdminLayout as AdminLayoutComponent } from '@/components/layouts/AdminLayout'

// Force dynamic for auth-protected routes
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()

  // Check if user is authenticated
  if (!session) {
    redirect(`/${locale}/sign-in?redirect_url=/${locale}/admin`)
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    redirect(`/${locale}/dashboard`)
  }

  return <AdminLayoutComponent>{children}</AdminLayoutComponent>
}

