import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Ensure user exists in DB, redirect to onboarding if not
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) redirect('/onboarding')

  return (
    <div className="min-h-screen lg:flex" style={{ background: 'var(--cream)' }}>
      <DashboardNav user={user} />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:ml-64 lg:flex-1 lg:px-8 lg:py-8 lg:pb-8">
        {children}
      </main>
    </div>
  )
}
