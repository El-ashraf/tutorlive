import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_MESSAGE_LENGTH = 5000
const MAX_HISTORY_MESSAGES = 12

type HistoryMessage = {
  role: 'user' | 'assistant'
  text: string
}

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Sign in to use the AI Copilot.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI Copilot needs a Gemini API key. Add GEMINI_API_KEY to Vercel to enable it.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const roomId = typeof body.roomId === 'string' ? body.roomId.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!roomId || roomId.length > 128 || /\s/.test(roomId) || !message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Enter a question of up to 2,000 characters.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'Complete your TutorLive profile before using the AI Copilot.' }, { status: 403 })
    }

    const booking = await prisma.booking.findUnique({
      where: { roomId },
      select: { studentId: true, tutorId: true, subject: true },
    })
    if (booking && booking.studentId !== user.id && booking.tutorId !== user.id) {
      return NextResponse.json({ error: 'You are not a participant in this classroom.' }, { status: 403 })
    }

    const history: HistoryMessage[] = Array.isArray(body.history)
      ? body.history
          .filter((item: unknown): item is HistoryMessage =>
            typeof item === 'object' && item !== null &&
            ((item as HistoryMessage).role === 'user' || (item as HistoryMessage).role === 'assistant') &&
            typeof (item as HistoryMessage).text === 'string',
          )
          .slice(-MAX_HISTORY_MESSAGES)
          .map((item: HistoryMessage) => ({ role: item.role, text: item.text.slice(0, MAX_MESSAGE_LENGTH) }))
      : []

    const contents = [
      ...history.map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ]

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are TutorLive's classroom copilot. Help a student understand concepts with clear, age-appropriate explanations. Prefer step-by-step reasoning and examples. Do not claim to see the classroom, whiteboard, or video. The lesson subject is ${booking?.subject || 'not specified'}.`,
            }],
          },
          contents,
          generationConfig: { maxOutputTokens: 700, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    )

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({ error: 'The AI service is busy or its free quota is exhausted. Try again later.' }, { status: 429 })
      }
      console.error('[AI_COPILOT] Gemini request failed:', response.status)
      return NextResponse.json({ error: 'The AI Copilot could not answer right now.' }, { status: 502 })
    }

    const result = await response.json()
    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim()

    if (!answer) {
      return NextResponse.json({ error: 'The AI Copilot returned an empty answer. Try rephrasing.' }, { status: 502 })
    }

    return NextResponse.json({ answer }, { headers: { 'Cache-Control': 'no-store, private' } })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'The AI Copilot timed out. Please try again.' }, { status: 504 })
    }
    console.error('[AI_COPILOT]', error)
    return NextResponse.json({ error: 'Could not process the AI Copilot request.' }, { status: 500 })
  }
}
