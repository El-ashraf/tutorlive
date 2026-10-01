import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    event = await verifyWebhook(request)
  } catch {
    return NextResponse.json({ error: 'Invalid Clerk webhook signature.' }, { status: 400 })
  }

  if (event.type !== 'user.updated') {
    return NextResponse.json({ received: true })
  }

  const displayName = [event.data.first_name, event.data.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim()

  if (!displayName) return NextResponse.json({ received: true })

  try {
    await prisma.user.updateMany({
      where: { clerkId: event.data.id },
      data: { name: displayName },
    })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[CLERK_USER_SYNC]', error)
    return NextResponse.json({ error: 'Could not sync the updated account.' }, { status: 500 })
  }
}
