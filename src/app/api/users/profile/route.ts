import { auth } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

function normalizeAvailability(value: unknown): Prisma.InputJsonObject | null {
  if (!value || typeof value !== 'object') return null
  const input = value as { timezone?: unknown; days?: unknown }
  if (typeof input.timezone !== 'string' || !input.timezone.trim() || !input.days || typeof input.days !== 'object') return null
  try { new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }).format(new Date()) } catch { return null }
  const days = input.days as Record<string, unknown>
  const safeDays: Record<string, Prisma.InputJsonValue> = {}
  for (const key of weekdayKeys) {
    const day = days[key]
    if (!day || typeof day !== 'object') continue
    const slot = day as { enabled?: unknown; start?: unknown; end?: unknown }
    if (typeof slot.enabled !== 'boolean' || typeof slot.start !== 'string' || typeof slot.end !== 'string') return null
    const validTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    if (!validTime(slot.start) || !validTime(slot.end) || slot.start >= slot.end) return null
    safeDays[key] = { enabled: slot.enabled, start: slot.start, end: slot.end }
  }
  return { timezone: input.timezone.trim(), days: safeDays }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, bio, headline, hourlyRate, subjects, availability, university, courseCodes } = await req.json()
    const displayName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
    if (!displayName || displayName.length > 100) {
      return NextResponse.json({ error: 'Enter a name between 1 and 100 characters.' }, { status: 400 })
    }

    const rate = hourlyRate === null || hourlyRate === '' ? null : Number(hourlyRate)
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 5000)) {
      return NextResponse.json({ error: 'Enter a valid hourly rate.' }, { status: 400 })
    }
    const normalizedAvailability = availability === undefined ? null : normalizeAvailability(availability)
    if (availability !== undefined && !normalizedAvailability) {
      return NextResponse.json({ error: 'Enter a valid timezone and weekly schedule.' }, { status: 400 })
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
        bio: typeof bio === 'string' ? bio.trim().slice(0, 5000) || null : null,
        hourlyRate: rate,
        subjects: Array.isArray(subjects) ? subjects.filter((item: unknown): item is string => typeof item === 'string').map((item: string) => item.trim().slice(0, 80)).filter(Boolean).slice(0, 30) : [],
      },
    })

    if (updatedUser.role === 'TUTOR') {
      const safeAvailability = normalizedAvailability || undefined
      const safeCourseCodes = Array.isArray(courseCodes)
        ? courseCodes.filter((code: unknown): code is string => typeof code === 'string').map((code: string) => code.trim().slice(0, 40)).filter(Boolean).slice(0, 30)
        : []
      await prisma.tutorProfile.upsert({
        where: { userId: updatedUser.id },
        create: {
          userId: updatedUser.id,
          headline: typeof headline === 'string' ? headline.trim().slice(0, 200) || null : null,
          availability: safeAvailability,
          university: typeof university === 'string' ? university.trim().slice(0, 160) || null : null,
          courseCodes: safeCourseCodes,
        },
        update: {
          headline: typeof headline === 'string' ? headline.trim().slice(0, 200) || null : null,
          ...(safeAvailability ? { availability: safeAvailability } : {}),
          university: typeof university === 'string' ? university.trim().slice(0, 160) || null : null,
          courseCodes: safeCourseCodes,
        },
      })
    }

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('[PROFILE_PATCH]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
