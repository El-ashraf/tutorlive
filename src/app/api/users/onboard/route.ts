import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { role } = await req.json()
    if (!['STUDENT', 'TUTOR'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.username ||
      'User'

    const email =
      clerkUser.emailAddresses[0]?.emailAddress ?? ''

    // Upsert the user (handles re-visiting onboarding)
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      create: {
        clerkId: userId,
        email,
        name,
        role,
        avatarUrl: clerkUser.imageUrl ?? null,
      },
      update: { role },
    })

    // If tutor, create tutor profile
    if (role === 'TUTOR') {
      await prisma.tutorProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('[ONBOARD]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
