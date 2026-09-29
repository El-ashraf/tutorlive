import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TutorBookingRequests from '@/components/dashboard/TutorBookingRequests'

export default async function BookingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user || user.role !== 'TUTOR') redirect('/dashboard')

  const requests = await prisma.booking.findMany({
    where: { tutorId: user.id },
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--navy)' }}>
          Session Requests
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Review and respond to incoming student session booking requests.
        </p>
      </div>

      <TutorBookingRequests initialRequests={requests} />
    </div>
  )
}
