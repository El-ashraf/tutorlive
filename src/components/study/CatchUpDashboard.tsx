'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'

type CatchTask = { id: string; week: number; title: string; description: string; estimatedHours: number; priority: string; completed: boolean }
type Plan = { id: string; title: string; subject: string; courseCode: string | null; progress: number; status: string; plan: { summary?: string; tasks?: CatchTask[] } }

export default function CatchUpDashboard() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subject, setSubject] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [notes, setNotes] = useState('')
  const [missedDate, setMissedDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    const response = await fetch('/api/catchup', { cache: 'no-store' })
    const result = await response.json()
    if (response.ok) setPlans(result.plans)
    else setError(result.error || 'Could not load catch-up plans.')
  }

  useEffect(() => { void refresh() }, [])

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/catchup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, courseCode, notes, missedDates: missedDate ? [missedDate] : [] }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create the recovery plan.')
      setSubject(''); setCourseCode(''); setNotes(''); setMissedDate('')
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the recovery plan.') }
    finally { setBusy(false) }
  }

  async function toggleTask(plan: Plan, taskId: string) {
    const tasks = (plan.plan.tasks || []).map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task)
    const progress = tasks.length ? Math.round(tasks.filter((task) => task.completed).length / tasks.length * 100) : 0
    const response = await fetch(`/api/catchup/${plan.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, progress, status: progress === 100 ? 'COMPLETED' : 'ACTIVE' }),
    })
    const result = await response.json()
    if (!response.ok) { setError(result.error || 'Could not save progress.'); return }
    setPlans((current) => current.map((item) => item.id === plan.id ? result.plan : item))
  }

  async function deletePlan(id: string) {
    if (!window.confirm('Delete this catch-up plan?')) return
    const response = await fetch(`/api/catchup/${id}`, { method: 'DELETE' })
    if (response.ok) setPlans((current) => current.filter((plan) => plan.id !== id))
  }

  return (
    <div className="space-y-6">
<header><p className="text-sm font-semibold text-blue-400">Catch-up plan</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Plan what to review</h1><p className="mt-2 max-w-2xl text-sm text-white/60">Add missed classes, topics, or notes. Use the plan to track what you have reviewed.</p></header>
      <form onSubmit={createPlan} className="glass-card space-y-4 rounded-2xl p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-white/80">Subject / course<input required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Biology 201" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
          <label className="text-sm text-white/80">Course code (optional)<input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} maxLength={40} placeholder="BIO 201" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
          <label className="text-sm text-white/80">A missed class date (optional)<input type="date" value={missedDate} onChange={(e) => setMissedDate(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
        </div>
        <label className="block text-sm text-white/80">Topics or notes to catch up on<textarea required value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={12000} rows={4} placeholder="List topics, paste class notes, or describe what you need to review…" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{busy ? 'Creating plan…' : 'Create a catch-up plan'}</button>
      </form>
      <section className="space-y-4"><h2 className="text-lg font-bold text-white">Your catch-up plans</h2>
        {!plans.length ? <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/50">Plans you create will appear here.</p> : plans.map((plan) => (
          <article key={plan.id} className="glass-card rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-blue-300">{plan.courseCode || plan.subject}</p><h3 className="mt-1 text-lg font-bold text-white">{plan.title}</h3><p className="mt-2 text-sm text-white/60">{plan.plan?.summary}</p></div><button onClick={() => void deletePlan(plan.id)} className="text-xs text-white/50 hover:text-rose-300">Delete</button></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${plan.progress}%` }} /></div><p className="mt-1 text-right text-xs text-white/50">{plan.progress}% complete</p>
            <div className="mt-3 space-y-2">{(plan.plan?.tasks || []).map((task) => <label key={task.id} className="flex gap-3 rounded-xl border border-white/5 p-3"><input type="checkbox" checked={task.completed} onChange={() => void toggleTask(plan, task.id)} className="mt-1 accent-blue-500" /><span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${task.completed ? 'text-white/40 line-through' : 'text-white'}`}>{task.title}</span><span className="mt-1 block text-xs text-white/55">Week {task.week} · {task.estimatedHours} study hours · {task.priority} priority</span><span className="mt-1 block text-sm text-white/60">{task.description}</span></span>{task.completed && <Check size={17} className="shrink-0 text-emerald-400" />}</label>)}</div>
            <Link href={`/tutors?subject=${encodeURIComponent(plan.subject)}`} className="mt-4 inline-flex rounded-lg bg-blue-600/20 px-3 py-2 text-sm font-semibold text-blue-300">Find a tutor for {plan.subject}</Link>
          </article>
        ))}
      </section>
    </div>
  )
}
