import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Sign in to leave a review.' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })

    const body = await request.json()
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : ''
    const rating = Number(body.rating)
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : ''
    if (!bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Choose a session and a rating from 1 to 5.' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, studentId: true, tutorId: true, status: true, review: { select: { id: true } } },
    })
    if (!booking || booking.studentId !== user.id) {
      return NextResponse.json({ error: 'Only the student for this session can review it.' }, { status: 403 })
    }
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Reviews are available after a session is completed.' }, { status: 409 })
    }
    if (booking.review) return NextResponse.json({ error: 'This session already has a review.' }, { status: 409 })

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          giverId: user.id,
          receiverId: booking.tutorId,
          rating,
          comment: comment || null,
        },
      })
      const totals = await tx.review.aggregate({
        where: { receiverId: booking.tutorId },
        _avg: { rating: true },
        _count: { _all: true },
      })
      await tx.tutorProfile.upsert({
        where: { userId: booking.tutorId },
        create: { userId: booking.tutorId, avgRating: totals._avg.rating ?? 0, reviewCount: totals._count._all },
        update: { avgRating: totals._avg.rating ?? 0, reviewCount: totals._count._all },
      })
      return created
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'This session already has a review.' }, { status: 409 })
    }
    console.error('[REVIEW_POST]', error)
    return NextResponse.json({ error: 'Could not submit the review.' }, { status: 500 })
  }
}
