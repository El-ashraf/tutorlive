import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import LiveSessionRoom from '@/components/session/LiveSessionRoom'

export default async function SessionPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { roomId } = await params

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) redirect('/onboarding')

  const booking = await prisma.booking.findUnique({
    where: { roomId },
    include: {
      student: true,
      tutor: true,
    },
  })

  return (
    <LiveSessionRoom
      roomId={roomId}
      booking={booking}
      currentUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    />
  )
}
