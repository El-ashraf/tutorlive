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
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <DashboardNav user={user} />
      <main className="flex-1 ml-64 p-8 max-w-6xl">
        {children}
      </main>
    </div>
  )
}
