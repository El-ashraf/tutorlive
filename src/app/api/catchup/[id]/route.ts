import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Catch-up plans are for student accounts.' }, { status: 403 })
    const plan = await prisma.catchUpPlan.findFirst({
      where: { id, userId: user.id },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Catch-up plan not found' }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('[CATCHUP_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch catch-up plan' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Catch-up plans are for student accounts.' }, { status: 403 })

    const body = await request.json()
    const progress = body.progress
    const status = body.status
    const tasks = body.tasks
    if (progress !== undefined && (!Number.isInteger(progress) || progress < 0 || progress > 100)) {
      return NextResponse.json({ error: 'Progress must be an integer from 0 to 100.' }, { status: 400 })
    }
    if (status !== undefined && !['ACTIVE', 'PAUSED', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid plan status.' }, { status: 400 })
    }
    if (tasks !== undefined && (!Array.isArray(tasks) || tasks.length > 12 || tasks.some((task) => !task || typeof task.id !== 'string' || typeof task.completed !== 'boolean'))) {
      return NextResponse.json({ error: 'Invalid task progress.' }, { status: 400 })
    }

    const ownedPlan = await prisma.catchUpPlan.findFirst({ where: { id, userId: user.id }, select: { id: true, plan: true } })
    if (!ownedPlan) return NextResponse.json({ error: 'Catch-up plan not found.' }, { status: 404 })

    let updatedPlan = ownedPlan.plan
    if (tasks !== undefined) {
      const current = ownedPlan.plan as { summary?: string; tasks?: Array<Record<string, unknown>> }
      const taskMap = new Map(tasks.map((task: { id: string; completed: boolean }) => [task.id, task.completed]))
      updatedPlan = {
        summary: current.summary || '',
        tasks: (current.tasks || []).map((task) => ({ ...task, completed: taskMap.get(String(task.id)) ?? Boolean(task.completed) })),
      }
    }

    const updated = await prisma.catchUpPlan.update({
      where: { id },
      data: {
        ...(progress !== undefined ? { progress } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(tasks !== undefined ? { plan: updatedPlan as any } : {}),
      },
    })

    return NextResponse.json({ plan: updated })
  } catch (error) {
    console.error('[CATCHUP_PATCH]', error)
    return NextResponse.json({ error: 'Failed to update catch-up plan' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Catch-up plans are for student accounts.' }, { status: 403 })

    const deleted = await prisma.catchUpPlan.deleteMany({ where: { id, userId: user.id } })
    if (!deleted.count) return NextResponse.json({ error: 'Catch-up plan not found.' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CATCHUP_DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete catch-up plan' }, { status: 500 })
  }
}
