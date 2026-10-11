import { auth } from '@/lib/auth'
import { parseAiJsonObject } from '@/lib/parse-ai-json'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Catch-up plans are for student accounts.' }, { status: 403 })
  const plans = await prisma.catchUpPlan.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ plans })
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Catch-up plans are for student accounts.' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Catch-up planning requires GEMINI_API_KEY.' }, { status: 503 })

  try {
    const body = await request.json()
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 120) : ''
    const courseCode = typeof body.courseCode === 'string' ? body.courseCode.trim().slice(0, 40) : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 12000) : ''
    const missedDates = Array.isArray(body.missedDates)
      ? body.missedDates.filter((date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))).slice(0, 20)
      : []
    if (!subject || (!notes && missedDates.length === 0)) {
      return NextResponse.json({ error: 'Enter a subject and either missed dates or notes.' }, { status: 400 })
    }

    const prompt = `Create a practical catch-up plan for a university student. Use plain, direct language and avoid motivational filler. Do not assume why classes were missed. Use the supplied dates and notes; do not invent course content. Include 1-3 manageable tasks per week, focusing on foundations and exam-relevant work. Return only JSON with shape {"summary": string, "tasks": [{"week": number, "title": string, "description": string, "estimatedHours": number, "priority": "HIGH"|"MEDIUM"|"LOW", "completed": false}]}. Subject: ${subject}. Course: ${courseCode || 'not specified'}. Missed dates: ${JSON.stringify(missedDates)}. Class notes or topics: ${notes || 'not provided'}. Keep the plan to at most 4 weeks and 12 tasks.`
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2500 },
      }),
      signal: AbortSignal.timeout(50_000),
    })
    if (!response.ok) {
      const providerError = await response.text().catch(() => '')
      console.error('[CATCHUP_POST] Gemini returned', response.status, providerError.slice(0, 500))
      if (response.status === 429) return NextResponse.json({ error: 'Gemini is busy or its request quota has been reached. Wait a little and try again.' }, { status: 502 })
      if (response.status === 403) return NextResponse.json({ error: 'Gemini rejected the API key. Check GEMINI_API_KEY in the deployment environment.' }, { status: 502 })
      return NextResponse.json({ error: 'Gemini could not create a recovery plan right now. Please retry.' }, { status: 502 })
    }
    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') || ''
    const generated = parseAiJsonObject(text)
    if (typeof generated.summary !== 'string' || !Array.isArray(generated.tasks)) throw new Error('Invalid plan response')
    const safePlan = {
      summary: generated.summary.slice(0, 1500),
      tasks: generated.tasks.slice(0, 12).map((task: any, index: number) => ({
        id: `task-${index + 1}`,
        week: Math.max(1, Math.min(4, Number(task.week) || 1)),
        title: String(task.title || 'Study task').slice(0, 160),
        description: String(task.description || '').slice(0, 500),
        estimatedHours: Math.max(0.25, Math.min(8, Number(task.estimatedHours) || 1)),
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(task.priority) ? task.priority : 'MEDIUM',
        completed: false,
      })),
    }
    const plan = await prisma.catchUpPlan.create({
      data: { userId: user.id, title: `${subject} catch-up plan`, subject, courseCode: courseCode || null, missedDates, sourceNotes: notes || null, plan: safePlan },
    })
    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('[CATCHUP_POST]', error)
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json({ error: 'Creating the recovery plan took too long. Try again with shorter notes.' }, { status: 504 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Gemini returned an unreadable plan. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Could not create a recovery plan.' }, { status: 500 })
  }
}
