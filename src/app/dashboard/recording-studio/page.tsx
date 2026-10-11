import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RecordingStudio from '@/components/recording/RecordingStudio'

export default async function RecordingStudioPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  })

  if (!user) redirect('/onboarding')
  if (user.role !== 'TUTOR') redirect('/dashboard')

  return <RecordingStudio />
}
