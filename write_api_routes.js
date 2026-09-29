const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\USER\\.gemini\\antigravity\\scratch\\tutorlive\\src\\app\\api';

const files = {
  'bookings/route.ts': `import { auth } from '@clerk/nextjs/server'
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
        title: title || \`\${subject} Session\`,
        scheduledAt: new Date(scheduledAt),
        durationMin: durationMin || 60,
        notes,
        status: 'PENDING',
      },
    })

    try {
      const dashboardUrl = \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/bookings\`
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
`,

  'bookings/[id]/route.ts': `import { auth } from '@clerk/nextjs/server'
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
`,

  'organizations/route.ts': `import { auth } from '@clerk/nextjs/server'
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

    const cleanCode = code.trim().toUpperCase().replace(/\\s+/g, '-')

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
`,

  'organizations/groups/route.ts': `import { auth } from '@clerk/nextjs/server'
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
`,

  'organizations/members/route.ts': `import { auth } from '@clerk/nextjs/server'
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
      return NextResponse.json({ error: \`User with email \${email} not registered on TutorLive yet.\` }, { status: 404 })
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
`,

  'users/profile/route.ts': `import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, bio, headline, hourlyRate, subjects } = await req.json()

    const updatedUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        name,
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
`
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(baseDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Wrote API file:', fullPath, 'Length:', content.length);
}
