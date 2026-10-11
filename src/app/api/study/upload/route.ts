import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStudyFileMimeType, MAX_STUDY_UPLOAD_BYTES, signGeminiUploadToken, STUDY_UPLOAD_CHUNK_BYTES } from '@/lib/gemini-upload'
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Sign in to upload study material.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Study tools are for student accounts.' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Study material generation is unavailable.' }, { status: 503 })

  try {
    const body = await request.json()
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 180) : ''
    const suppliedMimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
    const mimeType = getStudyFileMimeType(fileName, suppliedMimeType)
    const size = Number(body.size)
    if (!fileName || !mimeType) {
      return NextResponse.json({ error: 'Choose a PDF, PNG, JPEG, WebP, HEIC, or HEIF file.' }, { status: 400 })
    }
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_STUDY_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'The file must be 50 MB or smaller.' }, { status: 413 })
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
    const displayName = `tutorlive-study-${user.id}-${randomUUID()}-${safeName}`
    const response = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(size),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
      signal: AbortSignal.timeout(15000),
    })

    const uploadUrl = response.headers.get('x-goog-upload-url')
    if (!response.ok || !uploadUrl) {
      const providerError = await response.text().catch(() => '')
      console.error('[STUDY_UPLOAD_START] Gemini returned', response.status, providerError.slice(0, 500))
      return NextResponse.json({ error: 'Could not prepare this upload with Gemini. Check the API key and try again.' }, { status: 502 })
    }

    const uploadToken = signGeminiUploadToken({
      userId: user.id,
      uploadUrl,
      displayName,
      mimeType,
      size,
      expiresAt: Date.now() + 60 * 60 * 1000,
    })
    return NextResponse.json({ uploadToken, displayName, chunkSize: STUDY_UPLOAD_CHUNK_BYTES })
  } catch (error) {
    console.error('[STUDY_UPLOAD_START]', error)
    return NextResponse.json({ error: 'Could not prepare this upload. Please try again.' }, { status: 500 })
  }
}
