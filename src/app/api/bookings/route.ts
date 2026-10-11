import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateRoomId } from '@/lib/utils'
import { sendBookingRequest } from '@/lib/mailer'

const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function isWithinAvailability(scheduledAt: Date, durationMin: number, availability: unknown) {
  if (!availability || typeof availability !== 'object') return true
  const value = availability as { timezone?: unknown; days?: Record<string, unknown> }
  if (!value.days || typeof value.days !== 'object') return true
  const timezone = typeof value.timezone === 'string' ? value.timezone : 'UTC'
  let parts: Record<string, string> = {}
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(scheduledAt).map((part) => [part.type, part.value]))
  } catch {
    return false
  }
  const key = dayKeys.find((day) => day === parts.weekday.toLowerCase())
  const slot = key ? value.days[key] as { enabled?: unknown; start?: unknown; end?: unknown } | undefined : undefined
  if (!slot?.enabled || typeof slot.start !== 'string' || typeof slot.end !== 'string') return false
  const parseMinutes = (time: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(time)
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN
  }
  const start = parseMinutes(slot.start)
  const end = parseMinutes(slot.end)
  const chosen = Number(parts.hour) * 60 + Number(parts.minute)
  return Number.isFinite(start) && Number.isFinite(end) && chosen >= start && chosen + durationMin <= end
}

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

    if (typeof subject !== 'string' || subject.trim().length > 120 || typeof tutorId !== 'string') {
      return NextResponse.json({ error: 'Invalid tutor or subject.' }, { status: 400 })
    }
    const sessionStart = new Date(scheduledAt)
    const duration = Number(durationMin ?? 60)
    if (!Number.isFinite(sessionStart.getTime()) || sessionStart <= new Date() || !Number.isInteger(duration) || duration < 15 || duration > 180 || duration % 15 !== 0) {
      return NextResponse.json({ error: 'Choose a future date and a duration from 15 to 180 minutes in 15-minute steps.' }, { status: 400 })
    }

    const tutor = await prisma.user.findUnique({
      where: { id: tutorId, role: 'TUTOR' },
      include: { tutorProfile: true },
    })

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }
    if (tutor.id === student.id) return NextResponse.json({ error: 'You cannot book yourself.' }, { status: 400 })
    if (!isWithinAvailability(sessionStart, duration, tutor.tutorProfile?.availability)) {
      return NextResponse.json({ error: 'That time falls outside this tutor’s listed availability.' }, { status: 409 })
    }

    const sessionEnd = new Date(sessionStart.getTime() + duration * 60_000)
    const nearbyBookings = await prisma.booking.findMany({
      where: {
        tutorId: tutor.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
        scheduledAt: { gte: new Date(sessionStart.getTime() - 24 * 60 * 60_000), lt: sessionEnd },
      },
      select: { scheduledAt: true, durationMin: true },
    })
    const overlaps = nearbyBookings.some((existing) => {
      const existingEnd = existing.scheduledAt.getTime() + existing.durationMin * 60_000
      return sessionStart.getTime() < existingEnd && sessionEnd.getTime() > existing.scheduledAt.getTime()
    })
    if (overlaps) return NextResponse.json({ error: 'The tutor already has a pending or accepted session at that time.' }, { status: 409 })

    const roomId = generateRoomId()

    const booking = await prisma.booking.create({
      data: {
        roomId,
        studentId: student.id,
        tutorId: tutor.id,
        subject: subject.trim(),
        title: typeof title === 'string' ? title.trim().slice(0, 160) || `${subject.trim()} Session` : `${subject.trim()} Session`,
        scheduledAt: sessionStart,
        durationMin: duration,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) || null : null,
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
        scheduledAt: sessionStart,
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
