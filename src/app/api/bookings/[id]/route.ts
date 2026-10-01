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
    const { status } = await req.json()

    if (!['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: { student: true, tutor: true },
    })

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
  } catch (error: any) {
    console.error('[BOOKING_PATCH]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
