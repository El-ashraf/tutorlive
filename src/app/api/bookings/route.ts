import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateRoomId } from '@/lib/utils'
import { sendBookingRequest } from '@/lib/mailer'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    const body = await req.json()
    const { tutorId, subject, title, scheduledAt, durationMin, notes } = body

    if (!tutorId || !subject || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 })
    }

    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
    })

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    const roomId = generateRoomId()

    const booking = await prisma.booking.create({
      data: {
        roomId,
        studentId: student.id,
        tutorId: tutor.id,
        subject,
        title: title || `${subject} Session`,
        scheduledAt: new Date(scheduledAt),
        durationMin: durationMin || 60,
        notes,
        status: 'PENDING',
      },
    })

    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/bookings`
      await sendBookingRequest({
        to: tutor.email,
        tutorName: tutor.name,
        studentName: student.name,
        subject,
        scheduledAt: new Date(scheduledAt),
        dashboardUrl,
      })
    } catch (emailErr) {
      console.warn('Email notification deferred:', emailErr)
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('[BOOKING_POST]', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
