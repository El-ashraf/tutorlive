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
      className="rounded-3xl p-6 border shadow-sm text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #243149 0%, #344158 100%)', borderColor: '#344158' }}
    >
      <div className="relative z-10 grid md:grid-cols-2 gap-6 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f29a63]/20 text-[#f29a63] border border-[#f29a63]/30">
            <Sparkles size={14} /> Live Video + Whiteboard Studio
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Instant Class Room</h2>
            <p className="text-xs text-[#aeb9c7] mt-1">
              Start an instant live session without scheduling. Generate a room link and share it directly with your student.
            </p>
          </div>

          {!createdRoomId ? (
            <button
              onClick={handleLaunchInstantRoom}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-transform hover:scale-105 shadow-md"
              style={{ background: '#f29a63', color: '#243149' }}
            >
              <Video size={18} /> <PenTool size={18} /> Launch Instant Class
            </button>
          ) : (
            <div className="space-y-3 bg-[#1e273a] p-4 rounded-2xl border border-[#344158]">
              <div className="text-xs text-[#aeb9c7]">Room Ready: <span className="font-mono text-[#f29a63] font-bold">{createdRoomId}</span></div>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#243149] text-white flex items-center justify-center gap-1.5 border border-[#344158]"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Link Copied!' : 'Copy Student Link'}
                </button>
                <button
                  onClick={handleEnterRoom}
                  className="py-2 px-5 rounded-xl text-xs font-bold bg-[#f29a63] text-[#243149] flex items-center gap-1"
                >
                  Enter Room <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#1e273a] p-5 rounded-2xl border border-[#344158] space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <LogIn size={16} className="text-[#f29a63]" /> Join Class by Room ID or Link
          </h3>
          <p className="text-xs text-[#aeb9c7]">
            Got a class link or room ID from your tutor or group? Paste it here to join immediately.
          </p>

          <form onSubmit={handleJoinByInput} className="flex gap-2">
            <input
              type="text"
              placeholder="Paste room ID or full link..."
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#243149] text-xs text-white border border-[#344158] focus:outline-none focus:border-[#f29a63]"
            />
            <button
              type="submit"
              disabled={!joinInput.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#f29a63] text-[#243149] disabled:opacity-40 hover:opacity-90"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
