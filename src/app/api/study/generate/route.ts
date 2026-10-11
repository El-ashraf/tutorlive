import { auth } from '@/lib/auth'
import { parseAiJsonObject } from '@/lib/parse-ai-json'
import { prisma } from '@/lib/prisma'
import { STUDY_FILE_TYPES } from '@/lib/gemini-upload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_TEXT_LENGTH = 40_000
const GENERATION_TIMEOUT_MS = 40_000

type GeminiFileMetadata = {
  name?: string
  uri?: string
  mimeType?: string
  displayName?: string
  state?: string
}

async function getGeminiFile(name: string, apiKey: string) {
  let metadata: GeminiFileMetadata | null = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(2000),
    })
    if (!response.ok) throw new Error(`Gemini file lookup failed (${response.status}).`)
    metadata = await response.json()
    if (metadata?.state !== 'PROCESSING') return metadata
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return metadata
}

async function deleteGeminiFile(name: string, apiKey: string) {
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(3000),
    })
  } catch (error) {
    console.warn('[STUDY_GENERATE] Could not remove temporary Gemini file', error)
  }
}

function aiErrorMessage(status: number) {
  if (status === 429) return 'Gemini is busy or its request quota has been reached. Wait a little and try again.'
  if (status === 403) return 'Gemini rejected the API key. Check GEMINI_API_KEY in the deployment environment.'
  return 'Gemini could not process this material. Try again or use a clearer, shorter source.'
}

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Study tools are for student accounts.' }, { status: 403 })
  const decks = await prisma.studyDeck.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, subject: true, summary: true, sourceFileName: true, createdAt: true },
  })
  return NextResponse.json({ decks })
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Sign in to create study materials.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Study tools are for student accounts.' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Study material generation is unavailable.' }, { status: 503 })

  let temporaryFileName: string | null = null
  try {
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 120) : ''
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : ''
    const sourceFileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 255) : null
    const requestedFile = body.file && typeof body.file === 'object' ? body.file as Record<string, unknown> : null

    if (!title || !subject || (!text && !requestedFile)) {
      return NextResponse.json({ error: 'Add a title, subject, and notes or a document.' }, { status: 400 })
    }

    const parts: Array<Record<string, unknown>> = [{
      text: `Create a study deck for ${subject} using only the supplied material. Write in clear, natural language. Keep it specific and concise. Avoid generic introductions, conclusions, motivational filler, and repeated points. If the source is unclear or does not support a fact, say so instead of guessing. Make 10-20 useful flashcards and 5 multiple-choice questions with brief explanations. Return only a JSON object with this shape: {"summary": string, "cheatSheet": string, "flashcards": [{"front": string, "back": string}], "quiz": [{"question": string, "options": string[], "answerIndex": number, "explanation": string}]}. Title: ${title}. Notes: ${text || '(document attached)'}`,
    }]

    if (requestedFile) {
      const fileName = typeof requestedFile.name === 'string' ? requestedFile.name : ''
      if (!/^files\/[a-zA-Z0-9-]{1,100}$/.test(fileName)) {
        return NextResponse.json({ error: 'The uploaded file reference is invalid. Upload it again.' }, { status: 400 })
      }

      temporaryFileName = fileName
      const metadata = await getGeminiFile(fileName, apiKey)
      if (!metadata) {
        return NextResponse.json({ error: 'Gemini did not return file details. Please retry the upload.' }, { status: 502 })
      }
      if (metadata.state === 'FAILED') {
        temporaryFileName = metadata.name || fileName 
        return NextResponse.json({ error: 'Gemini could not read this file. Try a clearer or text-searchable PDF.' }, { status: 422 })
      }
      if (metadata.state !== 'ACTIVE') {
        temporaryFileName = metadata.name || fileName
        return NextResponse.json({ error: 'The file is still being processed. Wait a moment and try again.' }, { status: 503 })
      }
      if (
        metadata.name !== fileName ||
        typeof metadata.displayName !== 'string' ||
        !metadata.displayName.startsWith(`tutorlive-study-${user.id}-`) ||
        typeof metadata.uri !== 'string' ||
        typeof metadata.mimeType !== 'string' ||
        !STUDY_FILE_TYPES.includes(metadata.mimeType as (typeof STUDY_FILE_TYPES)[number])
      ) {
        return NextResponse.json({ error: 'This uploaded file does not belong to your account.' }, { status: 403 })
      }

      temporaryFileName = metadata.name
      parts.push({ file_data: { mime_type: metadata.mimeType, file_uri: metadata.uri } })
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 7000 },
      }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    })
    if (!response.ok) {
      const providerError = await response.text().catch(() => '')
      console.error('[STUDY_GENERATE] Gemini returned', response.status, providerError.slice(0, 500))
      return NextResponse.json({ error: aiErrorMessage(response.status) }, { status: 502 })
    }

    const result = await response.json()
    const output = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') || ''
    const generated = parseAiJsonObject(output)
    if (typeof generated.summary !== 'string' || typeof generated.cheatSheet !== 'string' || !Array.isArray(generated.flashcards) || !Array.isArray(generated.quiz)) {
      throw new Error('Gemini returned an incomplete study deck.')
    }

    const content = {
      flashcards: generated.flashcards.slice(0, 30).map((card: any) => ({ front: String(card?.front || '').slice(0, 500), back: String(card?.back || '').slice(0, 1500) })),
      quiz: generated.quiz.slice(0, 10).map((item: any) => ({ question: String(item?.question || '').slice(0, 600), options: Array.isArray(item?.options) ? item.options.slice(0, 6).map((option: unknown) => String(option).slice(0, 300)) : [], answerIndex: Math.max(0, Math.min(5, Number(item?.answerIndex) || 0)), explanation: String(item?.explanation || '').slice(0, 1000) })),
    }
    const deck = await prisma.studyDeck.create({
      data: {
        userId: user.id,
        title,
        subject,
        summary: generated.summary.slice(0, 12000),
        cheatSheet: generated.cheatSheet.slice(0, 20000),
        content,
        sourceFileName,
      },
    })
    return NextResponse.json({ deck }, { status: 201 })
  } catch (error) {
    console.error('[STUDY_GENERATE]', error)
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json({ error: 'Study material generation took too long. Try shorter notes or a smaller document.' }, { status: 504 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Gemini returned an unreadable study deck. Please retry this material.' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Could not create study materials. Please retry; if it keeps failing, check the deployment logs.' }, { status: 500 })
  } finally {
    if (temporaryFileName) await deleteGeminiFile(temporaryFileName, apiKey)
  }
}
