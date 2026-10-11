import { createHmac, timingSafeEqual } from 'node:crypto'

// Gemini's PDF input limit is 50 MB (decimal), so keep the app cap within it.
export const MAX_STUDY_UPLOAD_BYTES = 50_000_000
// Keep each proxied request below Vercel's request-body ceiling while letting
// PDFs around 3 MB finish in one Gemini finalize request.
export const STUDY_UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024
export const STUDY_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

const STUDY_FILE_EXTENSIONS: Record<string, (typeof STUDY_FILE_TYPES)[number]> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}

export function getStudyFileMimeType(fileName: string, mimeType: string) {
  const normalizedMimeType = mimeType.trim().toLowerCase()
  if (normalizedMimeType === 'image/jpg') return 'image/jpeg'
  if (STUDY_FILE_TYPES.includes(normalizedMimeType as (typeof STUDY_FILE_TYPES)[number])) {
    return normalizedMimeType as (typeof STUDY_FILE_TYPES)[number]
  }

  // Some browsers and mobile file providers report an empty MIME type or
  // application/octet-stream for valid files. Fall back to the extension.
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0]
  return extension ? STUDY_FILE_EXTENSIONS[extension] || null : null
}

export type GeminiUploadClaims = {
  userId: string
  uploadUrl: string
  displayName: string
  mimeType: string
  size: number
  expiresAt: number
}

function tokenSecret() {
  const secret = process.env.GEMINI_API_KEY
  if (!secret) throw new Error('GEMINI_API_KEY is not configured.')
  return secret
}

export function signGeminiUploadToken(claims: GeminiUploadClaims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signature = createHmac('sha256', tokenSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyGeminiUploadToken(token: string, userId: string): GeminiUploadClaims | null {
  try {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return null
    const expected = createHmac('sha256', tokenSecret()).update(payload).digest()
    const received = Buffer.from(signature, 'base64url')
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GeminiUploadClaims
    const uploadUrl = new URL(claims.uploadUrl)
    if (
      claims.userId !== userId ||
      !Number.isSafeInteger(claims.size) ||
      claims.size < 1 || claims.size > MAX_STUDY_UPLOAD_BYTES ||
      claims.expiresAt < Date.now() ||
      uploadUrl.protocol !== 'https:' ||
      uploadUrl.hostname !== 'generativelanguage.googleapis.com' ||
      !uploadUrl.pathname.startsWith('/upload/v1beta/files')
    ) return null
    return claims
  } catch {
    return null
  }
}
