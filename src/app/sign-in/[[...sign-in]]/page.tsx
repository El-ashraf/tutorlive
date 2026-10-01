import { SignIn } from '@clerk/nextjs'
import { isClerkConfigured } from '@/lib/clerk-config'

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--cream)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--navy)' }}>
            Welcome back
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to your TutorLive account
          </p>
        </div>
        {isClerkConfigured ? (
          <SignIn />
        ) : (
          <div
            className="rounded-2xl border p-6 text-center text-sm"
            style={{ borderColor: 'var(--border-warm)', color: 'var(--text-muted)' }}
          >
            Authentication is not configured yet. Add your Clerk keys to enable sign-in.
          </div>
        )}
      </div>
    </div>
  )
}
