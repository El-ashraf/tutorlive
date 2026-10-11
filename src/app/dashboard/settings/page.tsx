import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserProfile } from '@clerk/nextjs'
import SettingsPanel from '@/components/dashboard/SettingsPanel'

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

      <SettingsPanel />

      <div className="glass-card w-full min-w-0 overflow-x-hidden rounded-2xl p-0 sm:p-4">
        <UserProfile
          routing="hash"
          appearance={{
            variables: {
              colorPrimary: '#3B82F6',
              colorPrimaryForeground: '#FFFFFF',
              colorBackground: '#0B1220',
              colorForeground: '#F8FAFC',
              colorMuted: '#172033',
              colorMutedForeground: '#CBD5E1',
              colorNeutral: '#94A3B8',
              colorInput: '#111827',
              colorInputForeground: '#F8FAFC',
            },
            elements: {
              rootBox: 'w-full min-w-0',
              cardBox: 'w-full min-w-0 max-w-full',
              headerTitle: 'text-white',
              profileSectionTitle: 'text-white',
              formFieldLabel: 'text-slate-100',
              profileSectionContent: 'text-slate-200',
              navbarButton: 'text-slate-200 hover:bg-slate-800',
              navbarButtonActive: 'bg-blue-900 text-blue-100',
            },
          }}
        />
      </div>
    </div>
  )
}
