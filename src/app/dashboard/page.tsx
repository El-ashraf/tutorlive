import { auth } from '@clerk/nextjs/server'
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
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--navy)' }}>
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
            color: 'var(--amber)',
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
            color: '#f43f5e',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 sm:p-5 border min-w-0"
            style={{ background: '#fff', borderColor: 'var(--border-warm)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
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
        className="rounded-2xl border p-6"
        style={{ background: '#fff', borderColor: 'var(--border-warm)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--navy)' }}>
            Upcoming Sessions
          </h2>
          <Link
            href="/dashboard/sessions"
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: 'var(--amber)' }}
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--border-warm)' }} />
            <p className="font-medium" style={{ color: 'var(--navy)' }}>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--navy)', color: 'var(--amber)' }}
              >
                Find a tutor <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-warm)' }}>
            {upcomingSessions.map((booking) => {
              const other = isTutor
                ? (booking as any).student
                : (booking as any).tutor
              return (
                <div key={booking.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: 'var(--cream-dark)', color: 'var(--navy)' }}
                    >
                      {other.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
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
                            ? 'rgba(16,185,129,0.12)'
                            : 'rgba(245,158,11,0.12)',
                        color:
                          booking.status === 'ACCEPTED' ? '#059669' : '#d97706',
                      }}
                    >
                      {booking.status}
                    </span>
                    {booking.status === 'ACCEPTED' && (
                      <Link
                        href={`/session/${booking.roomId}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--navy)', color: 'var(--amber)' }}
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
          className="rounded-2xl border p-6"
          style={{ background: '#fff', borderColor: 'var(--border-warm)' }}
        >
          <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--navy)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/tutors"
              className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm"
              style={{ borderColor: 'var(--border-warm)' }}
            >
              <Users size={20} style={{ color: 'var(--amber)' }} />
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
                  Browse tutors
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Find your perfect match
                </div>
              </div>
            </Link>
            <Link
              href="/dashboard/sessions"
              className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm"
              style={{ borderColor: 'var(--border-warm)' }}
            >
              <Calendar size={20} style={{ color: 'var(--amber)' }} />
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
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
