'use client'

import { useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'

export default function SessionSummaryDrawer({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setOpen(true); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/bookings/${bookingId}/summary`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create session summary.')
      setSummary(data.summary)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create session summary.') }
    finally { setBusy(false) }
  }

  return <>
    <button onClick={() => void load()} className="min-h-10 rounded-xl border border-blue-400/20 px-3 text-xs font-semibold text-blue-300 hover:bg-blue-400/10"><FileText size={14} className="mr-1 inline" />Session summary</button>
    {open && <div className="fixed inset-0 z-[100] flex justify-end bg-black/65" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="summary-title" className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-slate-950 p-5 sm:p-7">
        <div className="flex items-center justify-between"><h2 id="summary-title" className="text-lg font-bold text-white">Session summary</h2><button aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/60"><X size={18} /></button></div>
        {busy ? <p className="mt-6 flex items-center gap-2 text-sm text-white/60"><Loader2 className="animate-spin" size={16} />Generating summary…</p> : error ? <p role="alert" className="mt-6 text-sm text-rose-300">{error}</p> : <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-white/75">{summary}</div>}
        <p className="mt-8 border-t border-white/10 pt-3 text-xs text-white/40">Generated from session details and booking notes only; it does not include a recording or transcript.</p>
      </section>
    </div>}
  </>
}
