'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, PenTool, ArrowRight, Copy, Check, Sparkles, LogIn } from 'lucide-react'
import { generateRoomId } from '@/lib/utils'

export default function InstantRoomLauncher({ userName }: { userName: string }) {
  const router = useRouter()
  const [joinInput, setJoinInput] = useState('')
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleLaunchInstantRoom = () => {
    const roomId = generateRoomId()
    setCreatedRoomId(roomId)
  }

  const handleEnterRoom = () => {
    if (!createdRoomId) return
    router.push(`/session/${createdRoomId}`)
  }

  const handleJoinByInput = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinInput.trim()) return

    let cleanId = joinInput.trim()
    if (cleanId.includes('/session/')) {
      cleanId = cleanId.split('/session/')[1]?.split('?')[0] || cleanId
    }

    router.push(`/session/${cleanId}`)
  }

  const copyLink = () => {
    if (!createdRoomId) return
    const link = `${window.location.origin}/session/${createdRoomId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="card-glow relative min-w-0 overflow-hidden rounded-3xl p-4 text-white sm:p-6"
      style={{ background: 'linear-gradient(135deg, var(--navy-light) 0%, var(--navy-card) 100%)', border: '1px solid rgba(37,99,235,0.2)' }}
    >
      <div className="relative z-10 grid min-w-0 items-center gap-5 md:grid-cols-2 sm:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--cobalt-bright)', border: '1px solid rgba(37,99,235,0.3)' }}>
            <Sparkles size={14} /> Live Video + Whiteboard Studio
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Instant Class Room</h2>
            <p className="mt-1 break-words text-xs" style={{ color: 'var(--text-muted)' }}>
              Start an instant live session without scheduling. Generate a room link and share it directly with your student.
            </p>
          </div>

          {!createdRoomId ? (
            <button
              onClick={handleLaunchInstantRoom}
              className="gloss-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-md transition-transform hover:scale-[1.02] sm:w-auto sm:px-6"
              style={{ background: 'var(--cobalt)', color: '#fff' }}
            >
              <Video size={18} /> <PenTool size={18} /> Launch Instant Class
            </button>
          ) : (
              <div className="min-w-0 space-y-3 rounded-2xl p-3 sm:p-4" style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}>
              <div className="break-all text-xs" style={{ color: 'var(--text-muted)' }}>Room Ready: <span className="font-mono font-bold" style={{ color: 'var(--cobalt-bright)' }}>{createdRoomId}</span></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={copyLink}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white"
                  style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Link Copied!' : 'Copy Student Link'}
                </button>
                <button
                  onClick={handleEnterRoom}
                  className="gloss-btn flex min-h-10 items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs font-bold sm:px-5"
                  style={{ background: 'var(--cobalt)', color: '#fff' }}
                >
                  Enter Room <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3 rounded-2xl p-4 sm:p-5" style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <LogIn size={16} style={{ color: 'var(--cobalt-bright)' }} /> Join Class by Room ID or Link
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Got a class link or room ID from your tutor or group? Paste it here to join immediately.
          </p>

          <form onSubmit={handleJoinByInput} className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Paste room ID or full link..."
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              className="min-w-0 w-full flex-1 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
            />
            <button
              type="submit"
              disabled={!joinInput.trim()}
              className="gloss-btn min-h-10 w-full shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-40 sm:w-auto"
              style={{ background: 'var(--cobalt)', color: '#fff' }}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
