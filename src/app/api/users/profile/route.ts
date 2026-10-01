import { auth } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, bio, headline, hourlyRate, subjects } = await req.json()
    const displayName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
    if (!displayName || displayName.length > 100) {
      return NextResponse.json({ error: 'Enter a name between 1 and 100 characters.' }, { status: 400 })
    }

    const [firstName, ...lastNameParts] = displayName.split(' ')
    const client = await clerkClient()
    await client.users.updateUser(userId, {
      firstName,
      lastName: lastNameParts.join(' '),
    })

    const updatedUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        name: displayName,
        bio,
        hourlyRate,
        subjects: Array.isArray(subjects) ? subjects : [],
      },
    })

    if (updatedUser.role === 'TUTOR') {
      await prisma.tutorProfile.upsert({
        where: { userId: updatedUser.id },
        create: {
          userId: updatedUser.id,
          headline,
        },
        update: {
          headline,
        },
      })
    }

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('[PROFILE_PATCH]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
