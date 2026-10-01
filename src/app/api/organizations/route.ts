import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const founder = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!founder) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { name, code } = await req.json()

    if (!name || !code) {
      return NextResponse.json({ error: 'Organization name and code are required' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '-')

    const existingCode = await prisma.organization.findUnique({
      where: { code: cleanCode },
    })

    if (existingCode) {
      return NextResponse.json({ error: 'Organization code already taken. Try another.' }, { status: 400 })
    }

    const org = await prisma.organization.create({
      data: {
        name,
        code: cleanCode,
        founderId: founder.id,
        members: {
          create: {
            userId: founder.id,
            role: 'FOUNDER',
          },
        },
      },
      include: {
        members: true,
        tutorialGroups: true,
      },
    })

    return NextResponse.json({ success: true, organization: org })
  } catch (error: any) {
    console.error('[ORG_POST]', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
