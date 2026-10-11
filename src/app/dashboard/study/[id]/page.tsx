import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import StudyDeckViewer from '@/components/study/StudyDeckViewer'

export default async function StudyDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) redirect('/onboarding')
  if (user.role !== 'STUDENT') redirect('/dashboard')
  const deck = await prisma.studyDeck.findFirst({ where: { id, userId: user.id } })
  if (!deck) notFound()
  return <StudyDeckViewer deck={deck} />
}
