import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import {
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs'
import {
  BookOpen,
  Video,
  PenTool,
  Monitor,
  Star,
  ArrowRight,
  Users,
  Clock,
} from 'lucide-react'

export default async function HomePage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--navy)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: 'var(--amber)' }}>
              TutorLive
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/tutors"
              className="text-sm font-medium text-white/70 transition-colors hover:text-[var(--amber)]"
            >
              Find a Tutor
            </Link>
            <Link
              href="/sign-up?role=tutor"
              className="text-sm font-medium text-white/70 transition-colors hover:text-[var(--amber)]"
            >
              Become a Tutor
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {!userId ? (
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
                  style={{
                    background: 'var(--amber)',
                    color: 'var(--navy)',
                  }}
                >
                  Get started
                </button>
              </SignUpButton>
              </>
            ) : (
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
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 50%, #2d3f5c 100%)',
          }}
        />
        {/* Decorative circles */}
        <div
          className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'var(--amber)' }}
        />
        <div
          className="absolute bottom-0 left-10 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'var(--amber)' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-28 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8"
            style={{
              background: 'rgba(242, 154, 99, 0.15)',
              color: 'var(--amber)',
              border: '1px solid rgba(242,154,99,0.3)',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--amber)' }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: 'var(--amber)' }}
              />
            </span>
            Live sessions available now
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            style={{ color: '#fff' }}
          >
            Learn live, learn{' '}
            <span style={{ color: 'var(--amber)' }}>better.</span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            Book a real-time tutoring session with expert tutors. Live video,
            shared whiteboard, screen sharing — everything you need in one room.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tutors"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-transform hover:scale-105"
              style={{ background: 'var(--amber)', color: 'var(--navy)' }}
            >
              Find a tutor <ArrowRight size={18} />
            </Link>
            <Link
              href="/sign-up?role=tutor"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Start tutoring
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16">
            {[
              { value: '100%', label: 'Free to start' },
              { value: 'Live', label: 'Video + Whiteboard' },
              { value: '1-on-1', label: 'Private sessions' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: 'var(--amber)' }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl font-bold mb-4"
              style={{ color: 'var(--navy)' }}
            >
              Everything in one live room
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              No switching apps. Everything your session needs, built in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Video,
                title: 'HD Video & Audio',
                desc: 'Crystal-clear live video powered by open-source Jitsi — no download needed.',
              },
              {
                icon: PenTool,
                title: 'Live Whiteboard',
                desc: 'Draw, annotate, and solve together in real-time. Strokes sync instantly.',
              },
              {
                icon: Monitor,
                title: 'Screen Sharing',
                desc: "Share your screen, code, or slides with your student or tutor instantly.",
              },
              {
                icon: BookOpen,
                title: 'Session Booking',
                desc: 'Browse tutors, pick a time, and get email confirmation automatically.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-6 border transition-shadow hover:shadow-md"
                style={{
                  background: '#fff',
                  borderColor: 'var(--border-warm)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(242,154,99,0.12)' }}
                >
                  <Icon size={22} style={{ color: 'var(--amber)' }} />
                </div>
                <h3
                  className="font-semibold text-base mb-2"
                  style={{ color: 'var(--navy)' }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="py-24 px-6"
        style={{ background: 'var(--cream-dark)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--navy)' }}>
              Get started in minutes
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Create your account',
                desc: 'Sign up as a student or tutor. Set up your profile in under 2 minutes.',
              },
              {
                step: '02',
                icon: Clock,
                title: 'Book a session',
                desc: 'Browse tutors by subject, check availability, and book a slot.',
              },
              {
                step: '03',
                icon: Video,
                title: 'Join the live room',
                desc: 'Click your session link — video, whiteboard and screen sharing are ready.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--navy)' }}
                >
                  <Icon size={24} style={{ color: 'var(--amber)' }} />
                </div>
                <div
                  className="text-xs font-bold tracking-widest mb-2"
                  style={{ color: 'var(--amber)' }}
                >
                  STEP {step}
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--navy)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center"
          style={{ background: 'var(--navy)' }}
        >
          <Star size={32} style={{ color: 'var(--amber)' }} className="mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#fff' }}>
            Start learning live today
          </h2>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Free to join. No subscription. Pay only for sessions you book.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-transform hover:scale-105"
            style={{ background: 'var(--amber)', color: 'var(--navy)' }}
          >
            Create free account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t py-8 px-6 text-center"
        style={{ borderColor: 'var(--border-warm)', color: 'var(--text-muted)' }}
      >
        <p className="text-sm">
          © 2025 TutorLive · Built with Next.js, Supabase & Jitsi
        </p>
      </footer>
    </div>
  )
}
