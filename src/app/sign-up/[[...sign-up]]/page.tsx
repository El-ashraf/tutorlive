import { SignUp } from '@clerk/nextjs'
import { isClerkConfigured } from '@/lib/clerk-config'

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 hero-glow"
      style={{ background: 'var(--navy)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Join TutorLive
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Create your free account — no credit card needed
          </p>
        </div>
        {isClerkConfigured ? (
          <SignUp />
        ) : (
          <div
            className="glass-card rounded-2xl p-6 text-center text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Authentication is not configured yet. Add your Clerk keys to enable sign-up.
          </div>
        )}
      </div>
    </div>
  )
}
