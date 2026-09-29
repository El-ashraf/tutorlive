import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProfileEditor from '@/components/dashboard/ProfileEditor'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tutorProfile: true },
  })

  if (!user) redirect('/onboarding')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--navy)' }}>
          My Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Update your bio, subjects, hourly rate, and personal details.
        </p>
      </div>

      <ProfileEditor user={user} />
    </div>
  )
}
