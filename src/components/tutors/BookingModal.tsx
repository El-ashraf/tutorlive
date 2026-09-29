'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

interface BookingModalProps {
  tutorId: string
  tutorName: string
  subjects: string[]
}

export default function BookingModal({
  tutorId,
  tutorName,
  subjects,
}: BookingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [subject, setSubject] = useState(subjects[0] || 'General Tutoring')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('14:00')
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString()

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId,
          subject,
          title: title || `${subject} Tutoring Session`,
          scheduledAt,
          durationMin: Number(duration),
          notes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to request booking')
      }

      setIsOpen(false)
      router.push('/dashboard/sessions')
    } catch (err: any) {
      alert(err.message || 'Error creating booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm transition-transform hover:scale-105 shadow-sm bg-[#243149] text-[#f29a63]"
      >
        Book 1-on-1 Session
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-3xl p-6 border border-[#e5ded3] bg-white shadow-xl relative"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-[#8a8680]"
            >
              <X size={18} />
            </button>

            <h2 className="text-2xl font-bold mb-1 text-[#243149]">
              Book Session with {tutorName}
            </h2>
            <p className="text-xs mb-6 text-[#8a8680]">
              Select your subject and preferred date/time.
            </p>

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[#243149]">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
                >
                  {subjects.length > 0 ? (
                    subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  ) : (
                    <option value="General Tutoring">General Tutoring</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#243149]">
                  Session Topic / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calculus Derivatives Homework Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#243149]">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#243149]">
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#243149]">
                  Notes for Tutor (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Any specific questions or materials you'd like to cover?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5ded3] text-sm focus:outline-none focus:border-[#f29a63]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-6 bg-[#243149] text-[#f29a63]"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Booking Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
