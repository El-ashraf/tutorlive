import { auth } from '@/lib/auth'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Sign in to start a group class.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  const { id } = await params
  const group = await prisma.tutorialGroup.findUnique({
    where: { id },
    include: { organization: { include: { members: { select: { userId: true, role: true } } } } },
  })
  if (!group) return NextResponse.json({ error: 'Tutorial group not found.' }, { status: 404 })
  const canTeach = group.tutorId === user.id || group.organization.founderId === user.id || group.organization.members.some((member) => member.userId === user.id && member.role === 'TUTOR')
  if (!canTeach) return NextResponse.json({ error: 'Only the assigned tutor or center staff can start this group class.' }, { status: 403 })

  const room = await prisma.groupSession.create({ data: { groupId: group.id, createdById: user.id, roomId: randomUUID() } })
  return NextResponse.json({ session: room, url: `/session/${room.roomId}` }, { status: 201 })
}
