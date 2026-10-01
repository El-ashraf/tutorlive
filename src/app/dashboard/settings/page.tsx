import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserProfile } from '@clerk/nextjs'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--ice)' }}>
          Account Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your password, security, and authentication methods.
        </p>
      </div>

      <div className="glass-card w-full min-w-0 overflow-x-hidden rounded-2xl p-0 sm:p-4">
        <UserProfile
          routing="hash"
          appearance={{
            variables: {
              colorPrimary: '#3B82F6',
              colorBackground: '#111827',
              colorText: '#F8FAFC',
              colorTextSecondary: '#94A3B8',
              colorInputBackground: '#0A0E14',
              colorInputText: '#F8FAFC',
              borderRadius: '0.75rem',
            },
            elements: {
              rootBox: 'w-full min-w-0',
              cardBox: 'w-full min-w-0 max-w-full',
            },
          }}
        />
      </div>
    </div>
  )
}
