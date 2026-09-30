'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LiveKitVideoCall from './LiveKitVideoCall'
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

interface CopilotMessage {
  role: 'user' | 'assistant'
  text: string
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
  const [chatStatus, setChatStatus] = useState('CONNECTING')
  const [chatError, setChatError] = useState('')
  const chatChannelRef = useRef<any>(null)
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([])
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotError, setCopilotError] = useState('')
  const [notes, setNotes] = useState('')

  const isTutor = currentUser.role === 'TUTOR' || booking?.tutorId === currentUser.id

  // Supabase Realtime Setup for Chat & Meeting Control
  useEffect(() => {
    const channel = supabase.channel(`room_ctrl:${roomId}`, {
      config: { broadcast: { self: false, ack: true } },
    })

    channel
      .on('broadcast', { event: 'NEW_CHAT_MESSAGE' }, ({ payload }) => {
        if (payload?.id && payload?.text && payload?.senderName) {
          setMessages((prev) => prev.some((message) => message.id === payload.id)
            ? prev
            : [...prev, payload])
        }
      })
      .on('broadcast', { event: 'END_SESSION' }, () => {
        alert('The session has been ended by the tutor.')
        router.push('/dashboard')
      })
      .subscribe((status) => setChatStatus(status))

    chatChannelRef.current = channel

    return () => {
      chatChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [roomId, router])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const channel = chatChannelRef.current
    if (!channel || chatStatus !== 'SUBSCRIBED') {
      setChatError('Chat is reconnecting. Please try sending again in a moment.')
      return
    }

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderName: currentUser.name,
      text: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    setChatError('')
    try {
      const status = await channel.send({
        type: 'broadcast',
        event: 'NEW_CHAT_MESSAGE',
        payload: msg,
      })
      if (status !== 'ok') throw new Error('Realtime send failed')
    } catch {
      setChatError('Message could not be sent. Check your connection and try again.')
      return
    }
    setMessages((prev) => [...prev, msg])
    setInputMessage('')
  }

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault()
    const question = copilotInput.trim()
    if (!question || copilotLoading) return

    const history = copilotMessages
    setCopilotMessages((prev) => [...prev, { role: 'user', text: question }])
    setCopilotInput('')
    setCopilotError('')
    setCopilotLoading(true)

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, message: question, history }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The AI Copilot could not answer.')
      setCopilotMessages((prev) => [...prev, { role: 'assistant', text: result.answer }])
    } catch (cause) {
      setCopilotError(cause instanceof Error ? cause.message : 'The AI Copilot could not answer.')
    } finally {
      setCopilotLoading(false)
    }
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

      const channel = chatChannelRef.current
      if (channel && chatStatus === 'SUBSCRIBED') await channel.send({
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
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-[#1e273a] text-white">
      {/* ── Top Header Bar ── */}
      <header className="min-h-14 sm:h-16 px-3 sm:px-6 py-2 sm:py-0 border-b border-[#344158] flex items-center justify-between gap-2 bg-[#243149] shrink-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/dashboard" className="shrink-0 font-bold text-base sm:text-lg text-[#f29a63]">
            TutorLive
          </Link>
          <div className="hidden sm:block h-4 w-px bg-[#344158]" />
          <div className="min-w-0">
            <h1 className="max-w-[34vw] sm:max-w-none truncate font-semibold text-xs sm:text-sm text-white">
              {booking?.subject || 'Live Tutoring Class'}
            </h1>
            <p className="hidden sm:block text-xs text-[#aeb9c7]">
              Room Code: <span className="font-mono text-[#f29a63] font-bold">{roomId}</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
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
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <button
            onClick={copyRoomLink}
            aria-label="Share room link"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#1e273a] text-xs font-semibold text-[#aeb9c7] hover:text-white border border-[#344158] transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share Link'}</span>
          </button>

          {isTutor ? (
            <button
              onClick={handleEndSession}
              aria-label="End session"
              className="flex items-center gap-1.5 p-2 sm:px-4 sm:py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm transition-all"
            >
              <PhoneOff size={14} /> <span className="hidden sm:inline">End Session</span>
            </button>
          ) : (
            <button
              onClick={handleLeaveRoom}
              aria-label="Leave class"
              className="flex items-center gap-1.5 p-2 sm:px-4 sm:py-1.5 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 border border-red-500/20 transition-all"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Leave Class</span>
            </button>
          )}
        </div>
      </header>

      <div className="md:hidden flex shrink-0 items-center gap-1 border-b border-[#344158] bg-[#243149] p-1.5">
        {[
          { id: 'split', label: 'Split', icon: LayoutTemplate },
          { id: 'whiteboard', label: 'Board', icon: PenTool },
          { id: 'video', label: 'Video', icon: Video },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id as any)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${
              viewMode === id ? 'bg-[#f29a63] text-[#243149]' : 'text-[#aeb9c7]'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Scrollable / Expandable Interactive Layout ── */}
      <div className="min-h-0 flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-2 sm:p-4 gap-3 sm:gap-4 bg-[#1e273a]">
        {/* Main Classroom Workspace Container */}
        <div className="min-w-0 flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 pr-1">
          {/* Whiteboard Container (Always mounted in DOM) */}
          <div
            className={`h-[52vh] min-h-[320px] shrink-0 transition-all duration-200 lg:h-full lg:min-h-0 ${
              viewMode === 'video'
                ? 'hidden'
                : viewMode === 'whiteboard'
                ? 'w-full flex-1'
                : 'w-full flex-1 md:w-3/5'
            }`}
          >
            <RealtimeWhiteboard
              roomId={roomId}
              userId={currentUser.id}
              userName={currentUser.name}
              isTutor={isTutor}
            />
          </div>

          {/* Keep the classroom connection mounted when switching views. */}
          <div
            className={`h-[42vh] min-h-[280px] shrink-0 transition-all duration-200 lg:h-full lg:min-h-0 ${
              viewMode === 'whiteboard'
                ? 'hidden'
                : viewMode === 'video'
                ? 'w-full flex-1'
                : 'w-full flex-1 md:w-2/5'
            }`}
          >
            <LiveKitVideoCall
              roomId={roomId}
              userName={currentUser.name}
              isTutor={isTutor}
            />
          </div>
        </div>

        {/* ── Right Side Panel (Chat, Copilot, Notes) ── */}
        <div className="w-full h-[42vh] min-h-[280px] flex flex-col bg-[#243149] rounded-2xl border border-[#344158] overflow-hidden shrink-0 lg:w-80 lg:h-full lg:min-h-0">
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
                    disabled={chatStatus !== 'SUBSCRIBED'}
                    aria-label="Send chat message"
                    className="p-2 rounded-xl bg-[#f29a63] text-[#243149] font-bold hover:opacity-90"
                  >
                    <Send size={14} />
                  </button>
                </form>
                <p aria-live="polite" className="mt-1 min-h-4 text-[10px] text-red-300">
                  {chatError || (chatStatus === 'SUBSCRIBED'
                    ? ''
                    : ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(chatStatus)
                      ? `Chat disconnected (${chatStatus}). Check your connection and Supabase Realtime settings.`
                      : 'Connecting to classroom chat…')}
                </p>
              </div>
            )}

            {activeTab === 'copilot' && (
              <div className="flex min-h-0 flex-1 flex-col text-xs text-[#aeb9c7]">
                <div className="p-3 bg-[#1e273a] rounded-xl border border-[#344158]">
                  <p className="font-semibold text-white mb-1 flex items-center gap-1.5 text-xs">
                    <Sparkles size={14} className="text-[#f29a63]" /> AI Tutor Assistant
                  </p>
                  <p className="text-[11px] text-[#aeb9c7]">
                    Ask for a clear explanation, worked example, or summary related to {booking?.subject || 'your lesson'}.
                  </p>
                  <p className="mt-1 text-[10px] text-[#aeb9c7]">
                    Powered by Gemini. Avoid entering private or sensitive information.
                  </p>
                </div>
                <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-[#344158] bg-[#1e273a] p-3">
                  {copilotMessages.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <Sparkles size={24} className="mb-2 text-[#f29a63]" />
                      <p className="text-xs font-medium text-white">Ask your AI Copilot</p>
                      <p className="mt-1 text-[10px]">The Copilot can explain topics and work through examples.</p>
                    </div>
                  ) : copilotMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        message.role === 'user'
                          ? 'self-end bg-[#f29a63] font-medium text-[#243149]'
                          : 'self-start bg-[#344158] text-white'
                      }`}
                    >
                      {message.text}
                    </div>
                  ))}
                  {copilotLoading && <p className="text-[10px] text-[#aeb9c7]">Thinking…</p>}
                  {copilotError && <p role="alert" className="text-[10px] text-red-300">{copilotError}</p>}
                </div>
                <form onSubmit={handleAskCopilot} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={copilotInput}
                    onChange={(event) => setCopilotInput(event.target.value)}
                    maxLength={2000}
                    disabled={copilotLoading}
                    placeholder="Ask a question…"
                    aria-label="Ask the AI Copilot"
                    className="min-w-0 flex-1 rounded-xl border border-[#344158] bg-[#1e273a] px-3 py-2 text-xs text-white focus:border-[#f29a63] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={copilotLoading || !copilotInput.trim()}
                    aria-label="Send question to AI Copilot"
                    className="rounded-xl bg-[#f29a63] p-2 font-bold text-[#243149] hover:opacity-90 disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </form>
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
