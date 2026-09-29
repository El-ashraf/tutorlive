import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--cream)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--navy)' }}>
            Join TutorLive
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Create your free account — no credit card needed
          </p>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
