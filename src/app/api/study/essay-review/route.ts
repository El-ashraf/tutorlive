import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Sign in to request feedback.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Writing feedback is available to student accounts.' }, { status: 403 })
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'Essay feedback requires GEMINI_API_KEY.' }, { status: 503 })
  try {
    const body = await request.json()
    const essay = typeof body.essay === 'string' ? body.essay.trim() : ''
    if (essay.length < 300 || essay.length > 20000) return NextResponse.json({ error: 'Paste at least 300 and no more than 20,000 characters.' }, { status: 400 })
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'Review this draft as a practical writing tutor. Use plain, direct language and refer to specific parts of the draft. Give feedback, not a rewritten submission. Avoid generic praise and canned introductions or conclusions. Comment on thesis clarity, organization, use of evidence, paragraph coherence, and style. Do not claim to verify sources or citations; point out what the student should verify. End with up to five prioritized revision actions.' }] },
        contents: [{ role: 'user', parts: [{ text: essay }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.25 },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Could not generate feedback right now.' }, { status: 502 })
    const result = await response.json()
    const feedback = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim()
    if (!feedback) return NextResponse.json({ error: 'The AI returned no feedback.' }, { status: 502 })
    return NextResponse.json({ feedback }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[ESSAY_REVIEW]', error)
    return NextResponse.json({ error: 'Could not review this draft.' }, { status: 500 })
  }
}
