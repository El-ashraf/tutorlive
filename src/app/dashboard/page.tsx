import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import { Calendar, BookOpen, Clock, Users, ArrowRight } from '@/components/ui/icons'
import Link from 'next/link'

import InstantRoomLauncher from '@/components/dashboard/InstantRoomLauncher'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      tutorProfile: true,
      bookingsAsStudent: {
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        include: { tutor: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      },
      bookingsAsTutor: {
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        include: { student: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      },
    },
  })

  if (!user) redirect('/onboarding')

  const isTutor = user.role === 'TUTOR'
  const upcomingSessions = isTutor ? user.bookingsAsTutor : user.bookingsAsStudent
  const pendingCount = upcomingSessions.filter((b) => b.status === 'PENDING').length

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--ice)' }}>
          Good day, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
          {isTutor
            ? 'Here\'s your teaching schedule and session overview.'
            : 'Here\'s what\'s coming up for your learning journey.'}
        </p>
      </div>

      {/* Instant Live Class Launcher & Room Join (Video + Whiteboard) */}
      <InstantRoomLauncher userName={user.name} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Upcoming sessions',
            value: upcomingSessions.filter((b) => b.status === 'ACCEPTED').length,
            icon: Calendar,
            color: 'var(--cobalt-bright)',
          },
          {
            label: 'Pending requests',
            value: pendingCount,
            icon: Clock,
            color: '#6366f1',
          },
          {
            label: 'Total sessions',
            value: isTutor
              ? (user.tutorProfile?.totalSessions ?? 0)
              : user.bookingsAsStudent.length,
            icon: BookOpen,
            color: '#10b981',
          },
          {
            label: isTutor ? 'Avg. rating' : 'Tutors booked',
            value: isTutor
              ? (user.tutorProfile?.avgRating.toFixed(1) ?? '—')
              : new Set(user.bookingsAsStudent.map((b) => b.tutorId)).size,
            icon: Users,
            color: 'var(--rose-bright)',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="glass-card rounded-2xl p-4 sm:p-5 min-w-0"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}20` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ice)' }}>
              {value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming sessions */}
      <div
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--ice)' }}>
            Upcoming Sessions
          </h2>
          <Link
            href="/dashboard/sessions"
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: 'var(--cobalt-bright)' }}
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--ice)' }}>
              No upcoming sessions
            </p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
              {isTutor
                ? 'Your accepted sessions will appear here.'
                : 'Book a session with a tutor to get started.'}
            </p>
            {!isTutor && (
              <Link
                href="/tutors"
                className="gloss-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--cobalt)', color: '#fff' }}
              >
                Find a tutor <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {upcomingSessions.map((booking) => {
              const other = isTutor
                ? (booking as any).student
                : (booking as any).tutor
              return (
                <div key={booking.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: 'var(--navy-light)', color: 'var(--cobalt-bright)' }}
                    >
                      {other.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm" style={{ color: 'var(--ice)' }}>
                        {booking.subject} with {other.name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDateTime(booking.scheduledAt)} · {booking.durationMin} min
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-12 sm:pl-0">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background:
                          booking.status === 'ACCEPTED'
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(37,99,235,0.15)',
                        color:
                          booking.status === 'ACCEPTED' ? '#34d399' : 'var(--cobalt-bright)',
                      }}
                    >
                      {booking.status}
                    </span>
                    {booking.status === 'ACCEPTED' && (
                      <Link
                        href={`/session/${booking.roomId}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--cobalt)', color: '#fff' }}
                      >
                        Join
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      {!isTutor && (
        <div
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--ice)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/tutors"
              className="flex items-center gap-3 p-4 rounded-xl transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Users size={20} style={{ color: 'var(--cobalt-bright)' }} />
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--ice)' }}>
                  Browse tutors
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Find your perfect match
                </div>
              </div>
            </Link>
            <Link
              href="/dashboard/sessions"
              className="flex items-center gap-3 p-4 rounded-xl transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Calendar size={20} style={{ color: 'var(--rose-bright)' }} />
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--ice)' }}>
                  My sessions
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  View booking history
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
