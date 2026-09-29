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
      <div
        className="rounded-2xl border border-[#e5ded3] bg-white p-12 text-center"
      >
        <Clock size={40} className="mx-auto mb-3 text-[#8a8680]" />
        <p className="font-semibold text-lg text-[#243149]">
          No session requests
        </p>
        <p className="text-xs mt-1 text-[#8a8680]">
          When students book sessions with you, they will appear here.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border border-[#e5ded3] bg-white p-6"
    >
      <div className="divide-y divide-[#e5ded3]">
        {requests.map((req) => (
          <div key={req.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 bg-[#243149] text-[#f29a63]"
              >
                {req.student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div className="font-bold text-base text-[#243149]">
                  {req.title || `${req.subject} Session`}
                </div>
                <div className="text-xs mt-1 text-[#8a8680]">
                  Student: <span className="font-semibold text-[#243149]">{req.student.name}</span> ({req.student.email})
                </div>
                <div className="text-xs mt-0.5 text-[#8a8680]">
                  Scheduled: <span className="font-semibold">{formatDateTime(req.scheduledAt)}</span> ({req.durationMin} min)
                </div>
                {req.notes && (
                  <div className="text-xs bg-[#fbf8f1] border border-[#e5ded3] p-2 rounded-lg mt-2 text-[#243149]">
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
                    className="flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'REJECTED')}
                    disabled={loadingId === req.id}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-xs bg-red-500/15 text-red-600 hover:bg-red-500/25 disabled:opacity-50 transition-all"
                  >
                    <X size={14} /> Decline
                  </button>
                </>
              ) : req.status === 'ACCEPTED' ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Accepted
                  </span>
                  <Link
                    href={`/session/${req.roomId}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#243149] text-[#f29a63]"
                  >
                    Join Room
                  </Link>
                </div>
              ) : (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
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
