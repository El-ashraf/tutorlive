'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import WebRtcVideoCall from './WebRtcVideoCall'
import RealtimeWhiteboard from './RealtimeWhiteboard'
import {
  Video,
  PenTool,
  LayoutTemplate,
  MessageSquare,
  Sparkles,
  Share2,
  LogOut,
  Check,
  Send,
  PhoneOff,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LiveSessionRoomProps {
  roomId: string
  booking: any
  currentUser: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface ChatMessage {
  id: string
  senderName: string
  text: string
  timestamp: string
}

export default function LiveSessionRoom({
  roomId,
  booking,
  currentUser,
}: LiveSessionRoomProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'split' | 'whiteboard' | 'video'>('split')
  const [activeTab, setActiveTab] = useState<'chat' | 'copilot' | 'notes'>('chat')
  const [copied, setCopied] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [notes, setNotes] = useState('')

  const isTutor = currentUser.role === 'TUTOR' || booking?.tutorId === currentUser.id

  // Supabase Realtime Setup for Chat & Meeting Control
  useEffect(() => {
    const channel = supabase.channel(`room_ctrl:${roomId}`, {
      config: { broadcast: { self: true } },
    })

    channel
      .on('broadcast', { event: 'NEW_CHAT_MESSAGE' }, ({ payload }) => {
        if (payload) {
          setMessages((prev) => [...prev, payload])
        }
      })
      .on('broadcast', { event: 'END_SESSION' }, () => {
        alert('The session has been ended by the tutor.')
        router.push('/dashboard')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, router])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderName: currentUser.name,
      text: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    const channel = supabase.channel(`room_ctrl:${roomId}`)
    channel.send({
      type: 'broadcast',
      event: 'NEW_CHAT_MESSAGE',
      payload: msg,
    })

    setInputMessage('')
  }

  // End Session for Everyone (Tutor action)
  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this live session for all participants?')) return

    try {
      if (booking?.id) {
        await fetch(`/api/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        })
      }

      const channel = supabase.channel(`room_ctrl:${roomId}`)
      await channel.send({
        type: 'broadcast',
        event: 'END_SESSION',
        payload: { endedBy: currentUser.name },
      })

      router.push('/dashboard')
    } catch (err) {
      console.error('Error ending session:', err)
      router.push('/dashboard')
    }
  }

  const handleLeaveRoom = () => {
    router.push('/dashboard')
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#1e273a] text-white">
      {/* ── Top Header Bar ── */}
      <header className="h-16 px-6 border-b border-[#344158] flex items-center justify-between bg-[#243149] shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-bold text-lg text-[#f29a63]">
            TutorLive
          </Link>
          <div className="h-4 w-px bg-[#344158]" />
          <div>
            <h1 className="font-semibold text-sm text-white">
              {booking?.subject || 'Live Tutoring Class'}
            </h1>
            <p className="text-xs text-[#aeb9c7]">
              Room Code: <span className="font-mono text-[#f29a63] font-bold">{roomId}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
        </div>

        {/* View Layout Selector */}
        <div className="hidden md:flex items-center gap-1 bg-[#1e273a] p-1 rounded-xl border border-[#344158]">
          {[
            { id: 'split', label: 'Split View', icon: LayoutTemplate },
            { id: 'whiteboard', label: 'Whiteboard Focus', icon: PenTool },
            { id: 'video', label: 'Video Focus', icon: Video },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === id
                  ? 'bg-[#f29a63] text-[#243149]'
                  : 'text-[#aeb9c7] hover:text-white'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e273a] text-xs font-semibold text-[#aeb9c7] hover:text-white border border-[#344158] transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copied ? 'Link Copied' : 'Share Link'}
          </button>

          {isTutor ? (
            <button
              onClick={handleEndSession}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm transition-all"
            >
              <PhoneOff size={14} /> End Session
            </button>
          ) : (
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 border border-red-500/20 transition-all"
            >
              <LogOut size={14} /> Leave Class
            </button>
          )}
        </div>
      </header>

      {/* ── Scrollable / Expandable Interactive Layout ── */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-[#1e273a]">
        {/* Main Classroom Workspace Container */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto pr-1">
          {/* Whiteboard Container (Always mounted in DOM) */}
          <div
            className={`h-full min-h-[500px] transition-all duration-200 ${
              viewMode === 'video'
                ? 'hidden'
                : viewMode === 'whiteboard'
                ? 'w-full flex-1'
                : 'flex-1 w-full md:w-3/5'
            }`}
          >
            <RealtimeWhiteboard
              roomId={roomId}
              userId={currentUser.id}
              userName={currentUser.name}
            />
          </div>

          {/* WebRTC Video Call Container (ALWAYS MOUNTED TO PREVENT DISCONNECT) */}
          <div
            className={`h-full min-h-[350px] transition-all duration-200 ${
              viewMode === 'whiteboard'
                ? 'hidden'
                : viewMode === 'video'
                ? 'w-full flex-1'
                : 'w-full md:w-2/5'
            }`}
          >
            <WebRtcVideoCall
              roomId={roomId}
              userId={currentUser.id}
              userName={currentUser.name}
            />
          </div>
        </div>

        {/* ── Right Side Panel (Chat, Copilot, Notes) ── */}
        <div className="w-80 h-full flex flex-col bg-[#243149] rounded-2xl border border-[#344158] overflow-hidden shrink-0">
          <div className="flex items-center border-b border-[#344158] bg-[#1e273a]">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
              { id: 'notes', label: 'Notes', icon: PenTool },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === id
                    ? 'border-[#f29a63] text-[#f29a63] bg-[#243149]'
                    : 'border-transparent text-[#aeb9c7] hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-[#aeb9c7] text-xs">
                      No messages yet. Say hello to start!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderName === currentUser.name
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-[#aeb9c7] mb-1">
                            {msg.senderName} · {msg.timestamp}
                          </span>
                          <div
                            className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                              isMe
                                ? 'bg-[#f29a63] text-[#243149] font-medium'
                                : 'bg-[#344158] text-white'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#1e273a] text-xs text-white border border-[#344158] focus:outline-none focus:border-[#f29a63]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#f29a63] text-[#243149] font-bold hover:opacity-90"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'copilot' && (
              <div className="flex-1 flex flex-col text-xs text-[#aeb9c7] space-y-3">
                <div className="p-3 bg-[#1e273a] rounded-xl border border-[#344158]">
                  <p className="font-semibold text-white mb-1 flex items-center gap-1.5 text-xs">
                    <Sparkles size={14} className="text-[#f29a63]" /> AI Tutor Assistant
                  </p>
                  <p className="text-[11px] text-[#aeb9c7]">
                    Need a quick explanation, formula, or concept summary during your session? Ask your AI copilot!
                  </p>
                </div>
                <div className="flex-1 border border-[#344158] rounded-xl bg-[#1e273a] p-3 text-center flex flex-col items-center justify-center">
                  <Sparkles size={24} className="text-[#f29a63] mb-2" />
                  <p className="font-medium text-white text-xs">AI Copilot Ready</p>
                  <p className="text-[10px] text-[#aeb9c7] mt-1">Ask questions anytime during your live tutoring lesson.</p>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col">
                <p className="text-xs font-semibold text-white mb-2">Private Session Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot down formulas, summary points, or homework details here..."
                  className="flex-1 w-full p-3 rounded-xl bg-[#1e273a] text-xs text-white border border-[#344158] focus:outline-none focus:border-[#f29a63] resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
