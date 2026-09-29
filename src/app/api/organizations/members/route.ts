import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, email, role } = await req.json()

    if (!organizationId || !email) {
      return NextResponse.json({ error: 'Organization ID and Email are required' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    })

    if (!targetUser) {
      return NextResponse.json({ error: `User with email ${email} not registered on TutorLive yet.` }, { status: 404 })
    }

    const member = await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUser.id,
        },
      },
      create: {
        organizationId,
        userId: targetUser.id,
        role: role || 'TUTOR',
      },
      update: {
        role: role || 'TUTOR',
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json({ success: true, member })
  } catch (error: any) {
    console.error('[ORG_MEMBER_POST]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
