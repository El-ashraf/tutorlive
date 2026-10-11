import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { STUDY_UPLOAD_CHUNK_BYTES, verifyGeminiUploadToken } from '@/lib/gemini-upload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

function providerErrorMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown } }
    if (typeof parsed.error?.message === 'string') return parsed.error.message.slice(0, 240)
  } catch {
    // Some upload failures are returned as plain text.
  }
  return body.trim().replace(/\s+/g, ' ').slice(0, 240)
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Sign in to upload study material.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
  if (!user) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Study tools are for student accounts.' }, { status: 403 })

  const token = request.headers.get('x-study-upload-token') || ''
  const claims = verifyGeminiUploadToken(token, user.id)
  if (!claims) return NextResponse.json({ error: 'This upload has expired. Start it again.' }, { status: 401 })

  const offset = Number(request.headers.get('x-study-upload-offset'))
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= claims.size) {
    return NextResponse.json({ error: 'Invalid upload position. Please restart the upload.' }, { status: 400 })
  }

  try {
    const bytes = await request.arrayBuffer()
    if (bytes.byteLength < 1 || bytes.byteLength > STUDY_UPLOAD_CHUNK_BYTES || offset + bytes.byteLength > claims.size) {
      return NextResponse.json({ error: 'Invalid upload chunk size.' }, { status: 413 })
    }

    const isFinalChunk = offset + bytes.byteLength === claims.size
    const response = await fetch(claims.uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': claims.mimeType,
        'Content-Length': String(bytes.byteLength),
        'X-Goog-Upload-Offset': String(offset),
        'X-Goog-Upload-Command': isFinalChunk ? 'upload, finalize' : 'upload',
      },
      body: bytes,
      signal: AbortSignal.timeout(55000),
    })

    const uploadStatus = response.headers.get('x-goog-upload-status')
    if (!isFinalChunk && response.ok && uploadStatus === 'active') {
      return NextResponse.json({ nextOffset: offset + bytes.byteLength })
    }
    if (!response.ok || (!isFinalChunk && uploadStatus !== 'active')) {
      const providerError = await response.text().catch(() => '')
      const detail = providerErrorMessage(providerError)
      console.error('[STUDY_UPLOAD_CHUNK] Gemini returned', response.status, uploadStatus, detail)
      return NextResponse.json({
        error: `Gemini rejected this upload part (HTTP ${response.status})${detail ? `: ${detail}` : '. Please retry.'}`,
      }, { status: 502 })
    }

    if (uploadStatus !== 'final') {
      const providerError = await response.text().catch(() => '')
      const detail = providerErrorMessage(providerError)
      console.error('[STUDY_UPLOAD_CHUNK] Gemini did not finalize upload', response.status, uploadStatus, detail)
      return NextResponse.json({ error: 'Gemini received the file but did not finish the upload. Please retry.' }, { status: 502 })
    }

    const result = await response.json()
    const file = result.file
    if (!isFinalChunk || typeof file?.name !== 'string' || typeof file?.uri !== 'string') {
      console.error('[STUDY_UPLOAD_CHUNK] Gemini returned an unexpected upload response')
      return NextResponse.json({ error: 'Gemini did not finish processing the upload. Try again.' }, { status: 502 })
    }

    return NextResponse.json({
      file: {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType || claims.mimeType,
        displayName: file.displayName || claims.displayName,
      },
    })
  } catch (error) {
    console.error('[STUDY_UPLOAD_CHUNK]', error)
    return NextResponse.json({ error: 'The upload connection was interrupted. Please retry.' }, { status: 502 })
  }
}
