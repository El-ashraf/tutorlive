'use client'

import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function HomeAuth({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {signedIn ? (
        <>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ color: 'var(--amber)' }}
          >
            Dashboard
          </Link>
          <UserButton />
        </>
      ) : (
        <>
          <SignInButton mode="modal">
            <button
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              style={{ background: 'var(--amber)', color: 'var(--navy)' }}
            >
              Get started
            </button>
          </SignUpButton>
        </>
      )}
    </div>
  )
}
