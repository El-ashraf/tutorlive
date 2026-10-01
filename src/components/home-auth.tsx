'use client'

import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { isClerkConfigured } from '@/lib/clerk-config'

export default function HomeAuth({ signedIn }: { signedIn: boolean }) {
  if (!isClerkConfigured) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/sign-up"
          className="gloss-btn text-sm font-semibold px-4 py-2 rounded-xl transition-all text-white hover:scale-105"
          style={{ background: 'var(--rose-bright)' }}
        >
          Get started
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {signedIn ? (
        <>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ color: 'var(--cobalt-bright)' }}
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
              className="gloss-btn text-sm font-semibold px-4 py-2 rounded-lg transition-all text-white hover:scale-105"
              style={{ background: 'var(--rose-bright)' }}
            >
              Get started
            </button>
          </SignUpButton>
        </>
      )}
    </div>
  )
}
