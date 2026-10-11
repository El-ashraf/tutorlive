import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import CatchUpDashboard from '@/components/study/CatchUpDashboard'

export default async function CatchUpPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } })
  if (!user) redirect('/onboarding')
  if (user.role !== 'STUDENT') redirect('/dashboard')
  return <CatchUpDashboard />
}
