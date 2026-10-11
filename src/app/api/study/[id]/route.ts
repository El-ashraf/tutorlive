import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Study tools are for student accounts.' }, { status: 403 })
  const { id } = await params
  const deck = await prisma.studyDeck.findFirst({ where: { id, userId: user.id } })
  if (!deck) return NextResponse.json({ error: 'Study deck not found' }, { status: 404 })
  return NextResponse.json({ deck })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Study tools are for student accounts.' }, { status: 403 })
  const { id } = await params
  const deleted = await prisma.studyDeck.deleteMany({ where: { id, userId: user.id } })
  if (!deleted.count) return NextResponse.json({ error: 'Study deck not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
