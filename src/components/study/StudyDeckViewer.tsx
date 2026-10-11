'use client'

import { useMemo, useState } from 'react'
import { Download, RotateCcw, Trash2 } from 'lucide-react'

type Card = { front: string; back: string }
type QuizItem = { question: string; options: string[]; answerIndex: number; explanation: string }
type Deck = { id: string; title: string; subject: string; summary: string; cheatSheet: string; content: unknown }

function wrapCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const lines: string[] = []
  for (const paragraph of value.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function downloadFlashcardImage(deck: Deck, card: Card, index: number) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return

  const width = 1800
  const panelWidth = 790
  const panelGap = 40
  const panelX = [80, 80 + panelWidth + panelGap]
  const textWidth = panelWidth - 100
  const fontSize = 32
  const lineHeight = 46
  const sides = [
    { label: 'QUESTION', text: card.front, color: '#60a5fa' },
    { label: 'ANSWER', text: card.back, color: '#34d399' },
  ]

  context.font = `500 ${fontSize}px Arial, sans-serif`
  const layouts = sides.map((side) => wrapCanvasText(context, side.text || ' ', textWidth))
  const panelY = 340
  const panelHeight = Math.max(720, ...layouts.map((lines) => lines.length * lineHeight + 190))
  canvas.width = width
  canvas.height = panelY + panelHeight + 100

  const drawRoundedPanel = (x: number, y: number, w: number, h: number) => {
    context.beginPath()
    context.roundRect(x, y, w, h, 28)
    context.fillStyle = '#111c31'
    context.fill()
    context.lineWidth = 2
    context.strokeStyle = '#263858'
    context.stroke()
  }

  context.fillStyle = '#081120'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#60a5fa'
  context.font = '700 26px Arial, sans-serif'
  context.fillText('TUTORLIVE  ·  STUDY DECK', 80, 75)
  context.fillStyle = '#f8fafc'
  context.font = '700 48px Arial, sans-serif'
  const titleLines = wrapCanvasText(context, deck.title, width - 160).slice(0, 2)
  titleLines.forEach((line, lineIndex) => context.fillText(line, 80, 145 + lineIndex * 58))
  context.fillStyle = '#a8b8d0'
  context.font = '26px Arial, sans-serif'
  context.fillText(deck.subject.slice(0, 90), 80, 280)

  sides.forEach((side, sideIndex) => {
    const x = panelX[sideIndex]
    drawRoundedPanel(x, panelY, panelWidth, panelHeight)
    context.fillStyle = side.color
    context.font = '700 24px Arial, sans-serif'
    context.fillText(side.label, x + 50, panelY + 65)
    context.fillStyle = '#f8fafc'
    context.font = `500 ${fontSize}px Arial, sans-serif`
    layouts[sideIndex].forEach((line, lineIndex) => {
      context.fillText(line, x + 50, panelY + 130 + lineIndex * lineHeight)
    })
  })

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const safeTitle = deck.title.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'study-deck'
    anchor.href = url
    anchor.download = `${safeTitle}-card-${index + 1}.png`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

function parseContent(content: unknown): { flashcards: Card[]; quiz: QuizItem[] } {
  if (!content || typeof content !== 'object') return { flashcards: [], quiz: [] }
  const value = content as { flashcards?: unknown; quiz?: unknown }
  return {
    flashcards: Array.isArray(value.flashcards) ? value.flashcards as Card[] : [],
    quiz: Array.isArray(value.quiz) ? value.quiz as QuizItem[] : [],
  }
}

export default function StudyDeckViewer({ deck }: { deck: Deck }) {
  const { flashcards, quiz } = useMemo(() => parseContent(deck.content), [deck.content])
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState<Set<number>>(() => new Set())
  const [quizIndex, setQuizIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  function download(name: string, value: string) {
    const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
  }

  async function removeDeck() {
    if (!window.confirm('Delete this study deck?')) return
    const response = await fetch(`/api/study/${deck.id}`, { method: 'DELETE' })
    if (response.ok) window.location.assign('/dashboard/study')
  }

  const currentQuiz = quiz[quizIndex]
  const quizComplete = quizIndex >= quiz.length

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><p className="text-sm font-semibold text-blue-400">{deck.subject}</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{deck.title}</h1></div>
        <button onClick={() => void removeDeck()} className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-white/10 px-3 text-sm text-rose-300 hover:bg-white/5"><Trash2 size={16} />Delete deck</button>
      </header>
      <section className="glass-card rounded-2xl p-4 sm:p-6"><h2 className="font-bold text-white">Summary</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{deck.summary}</p></section>
      <section className="glass-card rounded-2xl p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-white">Cheat sheet</h2><button onClick={() => download(`${deck.title}-cheat-sheet.txt`, deck.cheatSheet)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-2 text-sm font-semibold text-blue-300"><Download size={15} />Download</button></div><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-white/70">{deck.cheatSheet}</pre></section>
      <section className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-white">Flashcards</h2><p className="mt-1 text-xs text-white/50">Mastered {mastered.size} of {flashcards.length}</p></div><div className="flex flex-wrap gap-2"><button disabled={!flashcards.length} onClick={() => downloadFlashcardImage(deck, flashcards[cardIndex], cardIndex)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-50"><Download size={15} />Card PNG</button><button disabled={!flashcards.length} onClick={() => download(`${deck.title}-anki.txt`, flashcards.map((card) => `${card.front}\t${card.back}`).join('\n'))} className="inline-flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-2 text-sm font-semibold text-blue-300 disabled:opacity-50"><Download size={15} />Anki export</button></div></div>
        {flashcards.length ? <div className="mx-auto mt-4 max-w-2xl"><button onClick={() => setFlipped((value) => !value)} className="flex min-h-48 w-full items-center justify-center rounded-2xl border border-blue-400/20 bg-slate-950 p-6 text-center text-lg font-semibold text-white">{flipped ? flashcards[cardIndex]?.back : flashcards[cardIndex]?.front}</button><p className="mt-2 text-center text-xs text-white/50">Card {cardIndex + 1} of {flashcards.length} · Tap to flip</p><div className="mt-3 flex flex-wrap justify-center gap-2"><button onClick={() => { setMastered((old) => new Set(old).add(cardIndex)); setFlipped(false); setCardIndex((i) => (i + 1) % flashcards.length) }} className="rounded-lg bg-emerald-600/20 px-4 py-2 text-sm text-emerald-200">Got it</button><button onClick={() => { setFlipped(false); setCardIndex((i) => (i + 1) % flashcards.length) }} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">Review again</button></div></div> : <p className="mt-4 text-sm text-white/50">No flashcards were generated for this source.</p>}
      </section>
      <section className="glass-card rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-white">Practice quiz</h2><button onClick={() => { setQuizIndex(0); setAnswers([]) }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70"><RotateCcw size={15} />Restart</button></div>
        {!quiz.length ? <p className="mt-3 text-sm text-white/50">No quiz questions were generated.</p> : quizComplete ? <p className="mt-4 text-white">Score: {answers.filter((answer, i) => answer === quiz[i]?.answerIndex).length} / {quiz.length}</p> : <div className="mt-4"><p className="text-xs text-white/45">Question {quizIndex + 1} of {quiz.length}</p><p className="mt-2 font-semibold text-white">{currentQuiz.question}</p><div className="mt-3 grid gap-2">{currentQuiz.options.map((option, index) => <button key={`${quizIndex}-${index}`} disabled={answers[quizIndex] !== undefined} onClick={() => { setAnswers((old) => [...old.slice(0, quizIndex), index]); setTimeout(() => setQuizIndex((old) => old + 1), 1200) }} className={`rounded-xl border p-3 text-left text-sm ${answers[quizIndex] === index ? index === currentQuiz.answerIndex ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100' : 'border-rose-400 bg-rose-500/10 text-rose-100' : 'border-white/10 text-white/80 hover:bg-white/5'}`}>{option}</button>)}</div>{answers[quizIndex] !== undefined && <p className="mt-3 text-sm text-white/60">{currentQuiz.explanation}</p>}</div>}
      </section>
    </div>
  )
}
