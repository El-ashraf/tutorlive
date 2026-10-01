'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { GraduationCap, BookOpen, ArrowRight, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [role, setRole] = useState<'STUDENT' | 'TUTOR' | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (!role) return
    setLoading(true)
    try {
      const res = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Failed to save role')
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 hero-glow"
      style={{ background: 'var(--navy)' }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-block text-2xl font-bold mb-4"
            style={{ color: 'var(--cobalt-bright)' }}
          >
            TutorLive
          </div>
          <h1 className="text-3xl font-bold mb-3 text-white">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            How will you be using TutorLive?
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[
            {
              value: 'STUDENT' as const,
              icon: GraduationCap,
              title: 'I\'m a student',
              desc: 'Find expert tutors and book live sessions',
            },
            {
              value: 'TUTOR' as const,
              icon: BookOpen,
              title: 'I\'m a tutor',
              desc: 'Teach students and earn from live sessions',
            },
          ].map(({ value, icon: Icon, title, desc }) => (
            <button
              key={value}
              onClick={() => setRole(value)}
              className="p-5 sm:p-6 rounded-2xl text-left transition-all"
              style={{
                background: role === value ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
                border: role === value ? '2px solid var(--cobalt)' : '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: role === value ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <Icon
                  size={24}
                  style={{ color: role === value ? 'var(--cobalt-bright)' : 'var(--text-muted)' }}
                />
              </div>
              <div className="font-semibold text-base mb-1 text-white">{title}</div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: role === value ? 'var(--text-muted)' : 'var(--text-muted)' }}
              >
                {desc}
              </div>
            </button>
          ))}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={!role || loading}
          className="gloss-btn w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--cobalt)', color: '#fff' }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Continue <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
