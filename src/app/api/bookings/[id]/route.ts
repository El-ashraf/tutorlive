import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation } from '@/lib/mailer'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const status = body.status

    if (!['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const actor = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } })
    if (!actor) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })

    const booking = await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id }, include: { student: true, tutor: true } })
      if (!current) return null
      const isTutor = current.tutorId === actor.id
      const isStudent = current.studentId === actor.id
      if (!isTutor && !isStudent) return null
      const transitions = current.status === 'PENDING'
        ? (isTutor ? ['ACCEPTED', 'REJECTED', 'CANCELLED'] : ['CANCELLED'])
        : current.status === 'ACCEPTED' ? ['COMPLETED', 'CANCELLED'] : []
      if (!transitions.includes(status)) {
        throw new Error(current.status === 'PENDING' && !isTutor
          ? 'Only the tutor can accept or reject a booking.'
          : 'This booking can no longer be changed to that status.')
      }
      const changed = await tx.booking.updateMany({ where: { id, status: current.status }, data: { status } })
      if (changed.count !== 1) throw new Error('This booking changed in another request. Refresh and try again.')
      const updated = await tx.booking.findUniqueOrThrow({ where: { id }, include: { student: true, tutor: true } })
      if (status === 'COMPLETED') {
        await tx.tutorProfile.upsert({
          where: { userId: current.tutorId },
          create: { userId: current.tutorId, totalSessions: 1 },
          update: { totalSessions: { increment: 1 } },
        })
      }
      return updated
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found or access denied.' }, { status: 404 })

    if (status === 'ACCEPTED') {
      try {
        await sendBookingConfirmation({
          to: booking.student.email,
          studentName: booking.student.name,
          tutorName: booking.tutor.name,
          subject: booking.subject,
          scheduledAt: booking.scheduledAt,
          roomId: booking.roomId,
        })
      } catch (emailErr) {
        console.warn('Email confirmation deferred:', emailErr)
      }
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: unknown) {
    console.error('[BOOKING_PATCH]', error)
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message.startsWith('Only the tutor') || message.startsWith('This booking') || message.startsWith('This booking changed') ? 409 : 500
    return NextResponse.json({ error: status === 409 ? message : 'Server error' }, { status })
  }
}
