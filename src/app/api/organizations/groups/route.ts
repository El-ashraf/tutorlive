import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, name, description, tutorId } = await req.json()

    if (!organizationId || !name) {
      return NextResponse.json({ error: 'Group Name and Organization ID are required' }, { status: 400 })
    }

    const group = await prisma.tutorialGroup.create({
      data: {
        organizationId,
        name,
        description,
        tutorId: tutorId || null,
      },
      include: {
        tutor: true,
      },
    })

    return NextResponse.json({ success: true, group })
  } catch (error: any) {
    console.error('[ORG_GROUP_POST]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
