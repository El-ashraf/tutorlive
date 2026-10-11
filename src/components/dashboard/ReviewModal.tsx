'use client'

import { useState } from 'react'
import { Star, X } from 'lucide-react'

export default function ReviewModal({ bookingId, tutorName, reviewed = false }: { bookingId: string; tutorName: string; reviewed?: boolean }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, rating, comment }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Review could not be saved.')
      setMessage('Thanks—your review has been submitted.')
      window.setTimeout(() => { setOpen(false); window.location.reload() }, 900)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Review could not be saved.') }
    finally { setBusy(false) }
  }

  if (reviewed) return <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/45">Reviewed</span>
  return <>
    <button onClick={() => setOpen(true)} className="min-h-10 rounded-xl border border-amber-400/30 px-3 text-xs font-semibold text-amber-200 hover:bg-amber-400/10">Leave a review</button>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="review-title" className="w-full max-w-md rounded-t-2xl border border-white/10 bg-slate-900 p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between"><div><h2 id="review-title" className="text-lg font-bold text-white">Review {tutorName}</h2><p className="mt-1 text-sm text-white/55">Your feedback helps other students choose a tutor.</p></div><button aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/60"><X size={18} /></button></div>
        <form onSubmit={submit} className="mt-4 space-y-4"><fieldset><legend className="text-sm font-medium text-white/80">Rating</legend><div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} onClick={() => setRating(value)} className="rounded-lg p-1"><Star size={26} className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/25'} /></button>)}</div></fieldset><label className="block text-sm text-white/80">Comment (optional)<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>{message && <p role="status" className="text-sm text-white/70">{message}</p>}<button disabled={busy} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Submit review'}</button></form>
      </section>
    </div>}
  </>
}
