import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Sign in to join this classroom.' }, { status: 401 })
    }

    const roomId = new URL(request.url).searchParams.get('roomId')?.trim()
    if (!roomId || roomId.length > 128 || /\s/.test(roomId)) {
      return NextResponse.json({ error: 'A valid classroom ID is required.' }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const serverUrl = process.env.LIVEKIT_URL
    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json({ error: 'LiveKit is not configured on the server yet.' }, { status: 503 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'Complete your TutorLive profile before joining.' }, { status: 403 })
    }

    const booking = await prisma.booking.findUnique({
      where: { roomId },
      select: { studentId: true, tutorId: true },
    })
    if (booking && booking.studentId !== user.id && booking.tutorId !== user.id) {
      return NextResponse.json({ error: 'You are not a participant in this classroom.' }, { status: 403 })
    }

    const roomRole = booking?.tutorId === user.id ? 'TUTOR' : booking?.studentId === user.id ? 'STUDENT' : user.role

    const token = new AccessToken(apiKey, apiSecret, {
      // LiveKit requires identities to be unique within a room. Give each
      // browser join its own identity so a second tab/device doesn't evict it.
      identity: `${user.id}:${randomUUID()}`,
      name: user.name,
      metadata: JSON.stringify({ role: roomRole }),
      ttl: '12h',
    })
    // Students and tutors may independently publish mic, camera, and screen share.
    token.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
    })

    return NextResponse.json(
      { token: await token.toJwt(), serverUrl },
      { headers: { 'Cache-Control': 'no-store, private' } },
    )
  } catch (error) {
    console.error('[LIVEKIT_TOKEN]', error)
    return NextResponse.json({ error: 'Could not authorize access to this classroom.' }, { status: 500 })
  }
}
