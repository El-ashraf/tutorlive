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
      className="card-glow rounded-3xl p-6 text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--navy-light) 0%, var(--navy-card) 100%)', border: '1px solid rgba(37,99,235,0.2)' }}
    >
      <div className="relative z-10 grid md:grid-cols-2 gap-6 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--cobalt-bright)', border: '1px solid rgba(37,99,235,0.3)' }}>
            <Sparkles size={14} /> Live Video + Whiteboard Studio
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Instant Class Room</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Start an instant live session without scheduling. Generate a room link and share it directly with your student.
            </p>
          </div>

          {!createdRoomId ? (
            <button
              onClick={handleLaunchInstantRoom}
              className="gloss-btn inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-transform hover:scale-105 shadow-md"
              style={{ background: 'var(--cobalt)', color: '#fff' }}
            >
              <Video size={18} /> <PenTool size={18} /> Launch Instant Class
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Room Ready: <span className="font-mono font-bold" style={{ color: 'var(--cobalt-bright)' }}>{createdRoomId}</span></div>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Link Copied!' : 'Copy Student Link'}
                </button>
                <button
                  onClick={handleEnterRoom}
                  className="gloss-btn py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-1"
                  style={{ background: 'var(--cobalt)', color: '#fff' }}
                >
                  Enter Room <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <LogIn size={16} style={{ color: 'var(--cobalt-bright)' }} /> Join Class by Room ID or Link
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Got a class link or room ID from your tutor or group? Paste it here to join immediately.
          </p>

          <form onSubmit={handleJoinByInput} className="flex gap-2">
            <input
              type="text"
              placeholder="Paste room ID or full link..."
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none"
              style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}
            />
            <button
              type="submit"
              disabled={!joinInput.trim()}
              className="gloss-btn px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40"
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
