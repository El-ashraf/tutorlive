import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import OrganizationManager from '@/components/dashboard/OrganizationManager'

export default async function OrganizationPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) redirect('/onboarding')

  const organizations = await prisma.organization.findMany({
    where: {
      OR: [
        { founderId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      tutorialGroups: {
        include: {
          tutor: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <OrganizationManager
      userOrgs={organizations}
      user={user}
    />
  )
}
