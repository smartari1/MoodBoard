import { Metadata } from 'next'
import { DashboardLayout } from '@/components/layouts'
import { getSession } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'

// Force dynamic for auth-protected routes
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard | MoodB',
  description: 'MoodB Dashboard',
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()

  // Protect dashboard routes - redirect to sign-in if not authenticated
  if (!session) {
    redirect(`/${locale}/sign-in?redirect_url=/${locale}/dashboard`)
  }

  return <DashboardLayout>{children}</DashboardLayout>
}

