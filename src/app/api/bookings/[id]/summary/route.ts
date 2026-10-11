import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const { id } = await params
  const booking = await prisma.booking.findFirst({
    where: { id, OR: [{ studentId: user.id }, { tutorId: user.id }] },
    select: { id: true, title: true, subject: true, notes: true, status: true, scheduledAt: true, student: { select: { name: true } }, tutor: { select: { name: true } } },
  })
  if (!booking) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (booking.status !== 'COMPLETED') return NextResponse.json({ error: 'A summary is available after the session is completed.' }, { status: 409 })
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Session summaries require GEMINI_API_KEY.' }, { status: 503 })

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'Write a brief recap in plain, direct language. The input contains session details and booking notes, not a transcript. Do not imply you know what was discussed beyond those notes. Use the headings Session details, Topics from the notes, and Suggested next step. Do not add generic praise or filler.' }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ subject: booking.subject, title: booking.title, tutor: booking.tutor.name, student: booking.student.name, date: booking.scheduledAt.toISOString(), bookingNotes: booking.notes }) }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(25000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Could not generate a summary right now.' }, { status: 502 })
    const result = await response.json()
    const summary = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim()
    if (!summary) return NextResponse.json({ error: 'The AI returned an empty summary.' }, { status: 502 })
    return NextResponse.json({ summary }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[BOOKING_SUMMARY]', error)
    return NextResponse.json({ error: 'Could not generate a summary.' }, { status: 500 })
  }
}
