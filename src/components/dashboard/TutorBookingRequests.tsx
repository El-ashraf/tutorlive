'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { Check, X, Clock } from 'lucide-react'
import Link from 'next/link'

export default function TutorBookingRequests({
  initialRequests,
}: {
  initialRequests: any[]
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleAction = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status } : req))
      )
    } catch (err) {
      alert('Error updating booking status')
    } finally {
      setLoadingId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="font-semibold text-lg" style={{ color: 'var(--ice)' }}>
          No session requests
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          When students book sessions with you, they will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {requests.map((req) => (
          <div key={req.id} className="py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'var(--navy-light)', color: 'var(--cobalt-bright)' }}
              >
                {req.student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div className="font-bold text-base" style={{ color: 'var(--ice)' }}>
                  {req.title || `${req.subject} Session`}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Student: <span className="font-semibold" style={{ color: 'var(--ice)' }}>{req.student.name}</span> ({req.student.email})
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Scheduled: <span className="font-semibold">{formatDateTime(req.scheduledAt)}</span> ({req.durationMin} min)
                </div>
                {req.notes && (
                  <div className="text-xs p-2 rounded-lg mt-2" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', color: 'var(--ice)' }}>
                    "{req.notes}"
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              {req.status === 'PENDING' ? (
                <>
                  <button
                    onClick={() => handleAction(req.id, 'ACCEPTED')}
                    disabled={loadingId === req.id}
                    className="gloss-btn flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-50 transition-all shadow-sm"
                    style={{ background: 'var(--cobalt)', color: '#fff' }}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'REJECTED')}
                    disabled={loadingId === req.id}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-50 transition-all"
                    style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--rose-bright)', border: '1px solid rgba(244,63,94,0.2)' }}
                  >
                    <X size={14} /> Decline
                  </button>
                </>
              ) : req.status === 'ACCEPTED' ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                    Accepted
                  </span>
                  <Link
                    href={`/session/${req.roomId}`}
                    className="gloss-btn px-4 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'var(--cobalt)', color: '#fff' }}
                  >
                    Join Room
                  </Link>
                </div>
              ) : (
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--rose-bright)' }}>
                  {req.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
