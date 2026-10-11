'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react'

type DeckSummary = { id: string; title: string; subject: string; summary: string; sourceFileName: string | null; createdAt: string }
const coursePresets = [
  { university: 'Stanford', code: 'CS 106B', subject: 'Computer Science', title: 'Stanford CS 106B', notes: 'Topics: recursion, algorithmic analysis, data structures, and programming methodology.' },
  { university: 'Harvard', code: 'ECON 201', subject: 'Economics', title: 'Harvard ECON 201', notes: 'Topics: microeconomics, market equilibrium, elasticity, and consumer choice.' },
  { university: 'Oxford', code: 'ENG 102', subject: 'English', title: 'Oxford ENG 102', notes: 'Topics: critical reading, argument structure, evidence, and academic writing.' },
]

export default function StudyHubDashboard() {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')
  const [essay, setEssay] = useState('')
  const [essayFeedback, setEssayFeedback] = useState('')
  const [essayError, setEssayError] = useState('')
  const [essayBusy, setEssayBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function loadDecks() {
    const response = await fetch('/api/study/generate', { cache: 'no-store' })
    const result = await response.json()
    if (response.ok) setDecks(result.decks)
    else setError(result.error || 'Could not load your study decks.')
  }

  useEffect(() => { void loadDecks() }, [])

  async function createDeck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setUploadProgress(null)
    try {
      let uploadedFile: { name: string; uri: string; mimeType: string; displayName: string } | null = null
      if (file) {
        const startResponse = await fetch('/api/study/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
        })
        const start = await startResponse.json().catch(() => ({}))
        if (!startResponse.ok) throw new Error(start.error || 'Could not prepare the file upload.')
        const chunkSize = Number(start.chunkSize)
        if (!start.uploadToken || !Number.isSafeInteger(chunkSize) || chunkSize < 1) {
          throw new Error('The upload service returned an invalid session. Please try again.')
        }

        setUploadProgress(0)
        for (let offset = 0; offset < file.size; offset += chunkSize) {
          const end = Math.min(offset + chunkSize, file.size)
          const response = await fetch('/api/study/upload/chunk', {
            method: 'POST',
            headers: {
              'Content-Type': file.type,
              'X-Study-Upload-Token': start.uploadToken,
              'X-Study-Upload-Offset': String(offset),
            },
            body: file.slice(offset, end),
          })
          const result = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(result.error || 'The file upload failed. Please try again.')
          if (end === file.size) uploadedFile = result.file
          setUploadProgress(Math.round((end / file.size) * 100))
        }
        if (!uploadedFile) throw new Error('The file upload did not finish. Please try again.')
        setUploadProgress(null)
      }
      const response = await fetch('/api/study/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, text, file: uploadedFile, fileName: file?.name }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create study materials.')
      setTitle(''); setSubject(''); setText(''); setFile(null)
      const input = document.getElementById('study-file') as HTMLInputElement | null
      if (input) input.value = ''
      await loadDecks()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create study materials.')
    } finally { setBusy(false); setUploadProgress(null) }
  }

  async function deleteDeck(id: string) {
    if (!window.confirm('Delete this study deck?')) return
    const response = await fetch(`/api/study/${id}`, { method: 'DELETE' })
    if (response.ok) setDecks((current) => current.filter((deck) => deck.id !== id))
    else setError('Could not delete this deck.')
  }

  async function reviewEssay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEssayBusy(true); setEssayError(''); setEssayFeedback('')
    try {
      const response = await fetch('/api/study/essay-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ essay }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not review this draft.')
      setEssayFeedback(result.feedback)
    } catch (cause) { setEssayError(cause instanceof Error ? cause.message : 'Could not review this draft.') }
    finally { setEssayBusy(false) }
  }

  const visibleDecks = decks.filter((deck) => `${deck.title} ${deck.subject} ${deck.summary}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-400">Study tools</p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Create study materials from your notes</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">Paste notes or add a PDF or image to make a summary, flashcards, and a quiz.</p>
      </div>

      <form onSubmit={createDeck} className="glass-card space-y-4 rounded-2xl p-4 sm:p-6">
        <div><p className="text-xs font-semibold text-white/50">Quick course templates</p><div className="mt-2 flex flex-wrap gap-2">{coursePresets.map((preset) => <button type="button" key={preset.code} onClick={() => { setTitle(preset.title); setSubject(`${preset.subject} · ${preset.university} ${preset.code}`); setText(preset.notes) }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-blue-200 hover:bg-white/5">{preset.university} · {preset.code}</button>)}</div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-white/80">Deck title
            <input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" placeholder="Week 4: Cell biology" />
          </label>
          <label className="text-sm text-white/80">Subject or course
            <input required value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" placeholder="Biology 201" />
          </label>
        </div>
        <label className="block text-sm text-white/80">Paste notes
          <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={40000} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" placeholder="Paste lecture notes or key topics…" />
        </label>
        <label className="block text-sm text-white/80">Or upload a PDF or scanned image
          <input id="study-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif" onChange={(event) => {
            const selectedFile = event.target.files?.[0] || null
            if (selectedFile && selectedFile.size > 50_000_000) {
              setFile(null)
              event.target.value = ''
              setError('This file is over the 50 MB upload limit.')
              return
            }
            setError('')
            setFile(selectedFile)
          }} className="mt-1 block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white" />
          <span className="mt-1 block text-xs text-white/40">PDF, PNG, JPEG, WebP, HEIC, and HEIF files up to 50 MB. Larger files upload in 4 MB parts. Don’t upload material you don’t have permission to use.</span>
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{busy ? uploadProgress !== null ? `Uploading file ${uploadProgress}%…` : 'Creating study deck…' : 'Create study deck'}
        </button>
      </form>

      <form onSubmit={reviewEssay} className="glass-card space-y-3 rounded-2xl p-4 sm:p-6">
        <div><h2 className="font-bold text-white">Essay and lab report feedback</h2><p className="mt-1 text-xs text-white/50">Get revision guidance on your argument and structure. Your draft is sent to Gemini for this request and is not saved as a study deck.</p></div>
        <textarea required minLength={300} maxLength={20000} value={essay} onChange={(event) => setEssay(event.target.value)} rows={7} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="Paste a draft of at least 300 characters…" />
        {essayError && <p role="alert" className="text-sm text-rose-300">{essayError}</p>}
        <button disabled={essayBusy} className="min-h-10 rounded-xl border border-blue-400/20 px-4 text-sm font-semibold text-blue-300 disabled:opacity-50">{essayBusy ? 'Reviewing…' : 'Get writing feedback'}</button>
        {essayFeedback && <div className="rounded-xl border border-white/10 p-4"><h3 className="font-semibold text-white">Feedback</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{essayFeedback}</p></div>}
      </form>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-bold text-white">Your study decks</h2>
          <label className="relative block sm:w-72"><Search size={16} className="absolute left-3 top-3 text-white/40" /><input aria-label="Search decks" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white" placeholder="Search by title or course" /></label>
        </div>
        {visibleDecks.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/50">{decks.length ? 'No decks match this search.' : 'Your created decks will appear here.'}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleDecks.map((deck) => (
            <article key={deck.id} className="glass-card min-w-0 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3"><FileText className="shrink-0 text-blue-400" size={20} /><button aria-label={`Delete ${deck.title}`} onClick={() => void deleteDeck(deck.id)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-rose-300"><Trash2 size={16} /></button></div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-300">{deck.subject}</p>
              <h3 className="mt-1 truncate font-bold text-white">{deck.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-white/55">{deck.summary}</p>
              <Link href={`/dashboard/study/${deck.id}`} className="mt-4 inline-flex rounded-lg bg-blue-600/20 px-3 py-2 text-sm font-semibold text-blue-300">Open deck</Link>
            </article>
          ))}</div>
        )}
      </section>
    </div>
  )
}
