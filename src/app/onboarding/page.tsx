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
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--cream)' }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-block text-2xl font-bold mb-4"
            style={{ color: 'var(--navy)' }}
          >
            TutorLive
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--navy)' }}>
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            How will you be using TutorLive?
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
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
              className="p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md"
              style={{
                background: role === value ? 'var(--navy)' : '#fff',
                borderColor: role === value ? 'var(--navy)' : 'var(--border-warm)',
                color: role === value ? '#fff' : 'var(--navy)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: role === value ? 'rgba(242,154,99,0.2)' : 'rgba(36,49,73,0.08)',
                }}
              >
                <Icon
                  size={24}
                  style={{ color: role === value ? 'var(--amber)' : 'var(--navy)' }}
                />
              </div>
              <div className="font-semibold text-base mb-1">{title}</div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: role === value ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}
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
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ background: 'var(--navy)', color: 'var(--amber)' }}
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
