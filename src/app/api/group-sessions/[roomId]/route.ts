import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const { roomId } = await params
  const session = await prisma.groupSession.findUnique({ where: { roomId }, include: { group: { include: { organization: { include: { members: { where: { userId: user.id }, select: { role: true } } } } } } } })
  if (!session) return NextResponse.json({ error: 'Group session not found' }, { status: 404 })
  const canEnd = session.createdById === user.id || session.group.tutorId === user.id || session.group.organization.founderId === user.id || session.group.organization.members.some((member) => member.role === 'TUTOR')
  if (!canEnd) return NextResponse.json({ error: 'Only the group tutor or center founder can end this class.' }, { status: 403 })
  await prisma.groupSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', endedAt: new Date() } })
  return NextResponse.json({ success: true })
}
