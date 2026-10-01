import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserProfile } from '@clerk/nextjs'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--navy)' }}>
          Account Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your password, security, and authentication methods.
        </p>
      </div>

      <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: 'var(--border-warm)' }}>
        <UserProfile routing="hash" />
      </div>
    </div>
  )
}
