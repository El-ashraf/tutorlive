import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Calendar, Video, Clock, ArrowRight } from 'lucide-react'

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
        <h1 className="text-3xl font-bold" style={{ color: 'var(--navy)' }}>
          {isTutor ? 'Teaching Sessions' : 'My Sessions'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your live tutoring sessions and join video rooms.
        </p>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{ background: '#fff', borderColor: 'var(--border-warm)' }}
      >
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto mb-3" style={{ color: 'var(--border-warm)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--navy)' }}>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs"
                style={{ background: 'var(--navy)', color: 'var(--amber)' }}
              >
                Find a Tutor <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-warm)' }}>
            {bookings.map((b) => {
              const other = isTutor ? (b as any).student : (b as any).tutor
              return (
                <div key={b.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ background: 'var(--navy)', color: 'var(--amber)' }}
                    >
                      {other.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-base" style={{ color: 'var(--navy)' }}>
                        {b.title || `${b.subject} Session`}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        With {other.name} · {formatDateTime(b.scheduledAt)} ({b.durationMin} min)
                      </div>
                      {b.notes && (
                        <div className="text-xs italic mt-1" style={{ color: 'var(--amber)' }}>
                          Note: "{b.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{
                        background:
                          b.status === 'ACCEPTED'
                            ? 'rgba(16,185,129,0.12)'
                            : b.status === 'PENDING'
                            ? 'rgba(245,158,11,0.12)'
                            : 'rgba(239,68,68,0.12)',
                        color:
                          b.status === 'ACCEPTED'
                            ? '#059669'
                            : b.status === 'PENDING'
                            ? '#d97706'
                            : '#dc2626',
                      }}
                    >
                      {b.status}
                    </span>

                    {b.status === 'ACCEPTED' && (
                      <Link
                        href={`/session/${b.roomId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-transform hover:scale-105"
                        style={{ background: 'var(--navy)', color: 'var(--amber)' }}
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
