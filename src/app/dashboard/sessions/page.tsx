import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Calendar, Video, Clock, ArrowRight } from '@/components/ui/icons'

export default async function SessionsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      bookingsAsStudent: {
        include: { tutor: true },
        orderBy: { scheduledAt: 'desc' },
      },
      bookingsAsTutor: {
        include: { student: true },
        orderBy: { scheduledAt: 'desc' },
      },
    },
  })

  if (!user) redirect('/onboarding')

  const isTutor = user.role === 'TUTOR'
  const bookings = isTutor ? user.bookingsAsTutor : user.bookingsAsStudent

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--ice)' }}>
          {isTutor ? 'Teaching Sessions' : 'My Sessions'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your live tutoring sessions and join video rooms.
        </p>
      </div>

      <div
        className="glass-card rounded-2xl p-4 sm:p-6"
      >
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--ice)' }}>
              No sessions scheduled
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
              {isTutor
                ? 'Your accepted student requests will appear here.'
                : 'Browse tutors to book your first live 1-on-1 session.'}
            </p>
            {!isTutor && (
              <Link
                href="/tutors"
                className="gloss-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs"
                style={{ background: 'var(--cobalt)', color: '#fff' }}
              >
                Find a Tutor <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {bookings.map((b) => {
              const other = isTutor ? (b as any).student : (b as any).tutor
              return (
                <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ background: 'var(--navy-light)', color: 'var(--cobalt-bright)' }}
                    >
                      {other.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-base" style={{ color: 'var(--ice)' }}>
                        {b.title || `${b.subject} Session`}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        With {other.name} · {formatDateTime(b.scheduledAt)} ({b.durationMin} min)
                      </div>
                      {b.notes && (
                        <div className="text-xs italic mt-1" style={{ color: 'var(--cobalt-bright)' }}>
                          Note: "{b.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{
                        background:
                          b.status === 'ACCEPTED'
                            ? 'rgba(16,185,129,0.15)'
                            : b.status === 'PENDING'
                            ? 'rgba(37,99,235,0.15)'
                            : 'rgba(244,63,94,0.15)',
                        color:
                          b.status === 'ACCEPTED'
                            ? '#34d399'
                            : b.status === 'PENDING'
                            ? 'var(--cobalt-bright)'
                            : 'var(--rose-bright)',
                      }}
                    >
                      {b.status}
                    </span>

                    {b.status === 'ACCEPTED' && (
                      <Link
                        href={`/session/${b.roomId}`}
                        className="gloss-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-transform hover:scale-105"
                        style={{ background: 'var(--cobalt)', color: '#fff' }}
                      >
                        <Video size={14} /> Join Room
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
