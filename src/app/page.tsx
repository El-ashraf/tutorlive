import Link from 'next/link'
import { auth } from '@/lib/auth'
import HomeAuth from '@/components/home-auth'
import {
  BookOpen,
  Video,
  PenTool,
  Monitor,
  Star,
  ArrowRight,
  Users,
  Clock,
} from '@/components/ui/icons'

export default async function HomePage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen" style={{ background: 'var(--ice)' }}>
      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--navy)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white tracking-tight">
              TutorLive
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/tutors"
              className="text-sm font-medium text-white/70 transition-colors hover:text-[var(--cobalt-bright)]"
            >
              Find a Tutor
            </Link>
            <Link
              href="/sign-up?role=tutor"
              className="text-sm font-medium text-white/70 transition-colors hover:text-[var(--cobalt-bright)]"
            >
              Become a Tutor
            </Link>
          </div>

          <HomeAuth signedIn={Boolean(userId)} />
        </div>
        <div className="md:hidden flex items-center gap-5 px-4 pb-3 text-xs font-medium text-white/70">
          <Link href="/tutors" className="hover:text-[var(--cobalt-bright)]">Find a tutor</Link>
          <Link href="/sign-up?role=tutor" className="hover:text-[var(--cobalt-bright)]">Become a tutor</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'var(--navy)' }}>
        {/* Glow + grid background */}
        <div className="absolute inset-0 hero-glow" />
        <div className="absolute inset-0 grid-bg opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center lg:text-left w-full">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold mb-5 sm:mb-6"
                style={{
                  background: 'rgba(37,99,235,0.15)',
                  color: 'var(--cobalt-bright)',
                  border: '1px solid rgba(37,99,235,0.3)',
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--cobalt-bright)' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--cobalt-bright)' }} />
                </span>
                Live sessions available now
              </div>

              <h1 className="text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] mb-4 sm:mb-6 text-white tracking-tight">
                Learn live, learn{' '}
                <span style={{ color: 'var(--cobalt-bright)' }}>better.</span>
              </h1>

              <p
                className="text-sm sm:text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Book a real-time tutoring session with expert tutors. Live video,
                shared whiteboard, screen sharing — everything you need in one room.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link
                  href="/sign-up"
                  className="gloss-btn inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base text-white transition-transform hover:scale-105 card-glow"
                  style={{ background: 'linear-gradient(135deg, var(--cobalt) 0%, #1B63FF 100%)' }}
                >
                  Get started <ArrowRight size={18} />
                </Link>
                <Link
                  href="/tutors"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base text-white transition-all hover:bg-white/10"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  Browse tutors
                </Link>
              </div>
            </div>

            {/* Right: Glassmorphism stats card */}
            <div className="w-full max-w-sm lg:max-w-xs">
              <div className="glass-card rounded-3xl p-5 sm:p-8">
                <div className="space-y-5 sm:space-y-6">
                  {[
                    { value: '100%', label: 'Free to start', icon: Star },
                    { value: 'Live', label: 'Video + Whiteboard', icon: Video },
                    { value: '1-on-1', label: 'Private sessions', icon: Users },
                  ].map(({ value, label, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 sm:gap-4">
                      <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(37,99,235,0.15)' }}
                      >
                        <Icon size={20} style={{ color: 'var(--cobalt-bright)' }} />
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
                        <div className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6" style={{ background: 'var(--ice)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-[var(--navy)] tracking-tight">
              Everything in one live room
            </h2>
            <p className="text-sm sm:text-lg" style={{ color: 'var(--text-muted)' }}>
              No switching apps. Everything your session needs, built in.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                className="rounded-2xl p-5 sm:p-6 border transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: '#fff',
                  borderColor: 'var(--border-cool)',
                }}
              >
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(37,99,235,0.1)' }}
                >
                  <Icon size={20} style={{ color: 'var(--cobalt)' }} />
                </div>
                <h3 className="font-semibold text-base mb-2 text-[var(--navy)]">
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
        className="py-12 sm:py-24 px-4 sm:px-6"
        style={{
          background: 'linear-gradient(135deg, var(--cobalt) 0%, #1B63FF 50%, #1D4ED8 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-white tracking-tight">
              Get started in minutes
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                step: '1',
                icon: Users,
                title: 'Create your account',
                desc: 'Sign up as a student or tutor. Set up your profile in under 2 minutes.',
              },
              {
                step: '2',
                icon: Clock,
                title: 'Book a session',
                desc: 'Browse tutors by subject, check availability, and book a slot.',
              },
              {
                step: '3',
                icon: Video,
                title: 'Join the live room',
                desc: 'Click your session link — video, whiteboard and screen sharing are ready.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="bg-white rounded-2xl p-5 sm:p-6 text-center shadow-lg"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-3xl sm:text-4xl font-bold text-[var(--cobalt)]">{step}</span>
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(37,99,235,0.1)' }}
                  >
                    <Icon size={18} style={{ color: 'var(--cobalt)' }} />
                  </div>
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-[var(--navy)]">
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
      <section className="py-12 sm:py-24 px-4 sm:px-6" style={{ background: 'var(--ice)' }}>
        <div
          className="max-w-3xl mx-auto rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden"
          style={{ background: 'var(--navy-light)' }}
        >
          <div className="absolute inset-0 hero-glow opacity-50" />
          <div className="relative">
            <Star size={32} style={{ color: 'var(--cobalt-bright)' }} className="mx-auto mb-4" />
            <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-white tracking-tight">
              Start learning live today
            </h2>
            <p className="mb-6 sm:mb-8 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Free to join. No subscription. Pay only for sessions you book.
            </p>
            <Link
              href="/sign-up"
              className="gloss-btn inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-semibold text-white transition-transform hover:scale-105 card-glow"
              style={{ background: 'linear-gradient(135deg, var(--cobalt) 0%, #1B63FF 100%)' }}
            >
              Create free account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-8 px-4 sm:px-6 text-center border-t"
        style={{ borderColor: 'var(--border-cool)', color: 'var(--text-muted)' }}
      >
        <p className="text-sm">
          © 2025 TutorLive · Built with Next.js, Supabase & Jitsi
        </p>
      </footer>
    </div>
  )
}
