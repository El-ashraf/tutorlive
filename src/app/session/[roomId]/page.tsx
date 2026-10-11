import { auth } from '@/lib/auth'
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

  const [booking, groupSession] = await Promise.all([
    prisma.booking.findUnique({ where: { roomId }, include: { student: true, tutor: true } }),
    prisma.groupSession.findUnique({
      where: { roomId },
      include: { group: { include: { organization: { include: { members: { select: { userId: true } } } } } } },
    }),
  ])

  if (booking && (booking.studentId !== user.id && booking.tutorId !== user.id || booking.status !== 'ACCEPTED')) redirect('/dashboard')
  if (groupSession) {
    const isAuthorized = groupSession.status === 'ACTIVE' && groupSession.endedAt === null && (
      groupSession.group.tutorId === user.id ||
      groupSession.group.organization.founderId === user.id ||
      groupSession.group.organization.members.some((member) => member.userId === user.id)
    )
    if (!isAuthorized) redirect('/dashboard')
  }

  return (
    <LiveSessionRoom
      roomId={roomId}
      booking={booking || (groupSession ? { subject: groupSession.group.name } : null)}
      isGroupSession={Boolean(groupSession)}
      currentUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    />
  )
}
