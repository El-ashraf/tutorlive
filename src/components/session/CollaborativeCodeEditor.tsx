'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Play, RotateCcw } from 'lucide-react'

type Language = 'javascript' | 'python' | 'cpp' | 'sql'

export default function CollaborativeCodeEditor({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) {
  const [language, setLanguage] = useState<Language>('javascript')
  const [code, setCode] = useState('// Write code together\nconsole.log("Hello, TutorLive!")\n')
  const [output, setOutput] = useState('JavaScript runs in a sandboxed frame. Other languages sync live but need a trusted code runner to execute.')
  const [status, setStatus] = useState('CONNECTING')
  const channelRef = useRef<any>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let active = true
    let syncTimers: number[] = []
    const channel = supabase.channel(`code:${roomId}`, { config: { broadcast: { self: false, ack: true } } })
    const send = (event: string, payload: object) => channel.send({ type: 'broadcast', event, payload })
    const apply = (payload: { code?: unknown; language?: unknown }) => {
      if (typeof payload.code === 'string' && payload.code.length <= 50000) setCode(payload.code)
      if (['javascript', 'python', 'cpp', 'sql'].includes(String(payload.language))) setLanguage(payload.language as Language)
    }
    channel
      .on('broadcast', { event: 'CODE_CHANGED' }, ({ payload }) => apply(payload || {}))
      .on('broadcast', { event: 'CODE_SYNC_REQUEST' }, ({ payload }) => {
        if (payload?.sender !== userId) void send('CODE_SYNC', { code, language })
      })
      .on('broadcast', { event: 'CODE_SYNC' }, ({ payload }) => apply(payload || {}))
      .subscribe((nextStatus) => {
        if (!active) return
        setStatus(nextStatus)
        if (nextStatus === 'SUBSCRIBED') syncTimers = [300, 1200].map((delay) => window.setTimeout(() => { void send('CODE_SYNC_REQUEST', { sender: userId }) }, delay))
      })
    channelRef.current = channel
    return () => { active = false; syncTimers.forEach(window.clearTimeout); channelRef.current = null; void supabase.removeChannel(channel) }
  }, [roomId, userId, userName])

  function updateCode(next: string) {
    setCode(next)
    const channel = channelRef.current
    if (channel && status === 'SUBSCRIBED') void channel.send({ type: 'broadcast', event: 'CODE_CHANGED', payload: { code: next, language } })
  }

  function updateLanguage(next: Language) {
    setLanguage(next)
    const channel = channelRef.current
    if (channel && status === 'SUBSCRIBED') void channel.send({ type: 'broadcast', event: 'CODE_CHANGED', payload: { code, language: next } })
  }

  function runCode() {
    if (language !== 'javascript') {
      setOutput(`The ${language.toUpperCase()} runner is not configured. Code is still shared with the other participant.`)
      return
    }
    setOutput('Running…')
    const documentText = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src data:; style-src 'unsafe-inline'"><script>
      addEventListener('message', (event) => {
        if (event.source !== parent || event.data?.type !== 'run') return;
        const lines = [];
        const safeConsole = { log: (...args) => lines.push(args.map((value) => { try { return typeof value === 'string' ? value : JSON.stringify(value) } catch { return String(value) } }).join(' ')), warn: (...args) => lines.push(args.map(String).join(' ')), error: (...args) => lines.push(args.map(String).join(' ')) };
        try { (new Function('console', event.data.code))(safeConsole); parent.postMessage({ type: 'result', lines }, '*'); }
        catch (error) { parent.postMessage({ type: 'result', lines: [String(error)] }, '*'); }
      });
    <\/script>`
    const frame = frameRef.current
    if (!frame) return
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.data?.type !== 'result') return
      setOutput(event.data.lines.join('\n') || 'Program finished with no output.')
      window.removeEventListener('message', onMessage)
      window.clearTimeout(timeout)
    }
    window.addEventListener('message', onMessage)
    const timeout = window.setTimeout(() => {
      setOutput('Stopped after 3 seconds.')
      window.removeEventListener('message', onMessage)
    }, 3000)
    frame.onload = () => frame.contentWindow?.postMessage({ type: 'run', code }, '*')
    frame.srcdoc = documentText
    window.setTimeout(() => window.clearTimeout(timeout), 3100)
  }

  return <section className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3"><div><h2 className="text-sm font-bold text-white">Collaborative code</h2><p className="text-[11px] text-white/45">{status === 'SUBSCRIBED' ? 'Live sync connected' : `Sync: ${status}`}</p></div><select aria-label="Programming language" value={language} onChange={(event) => updateLanguage(event.target.value as Language)} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"><option value="javascript">JavaScript</option><option value="python">Python</option><option value="cpp">C++</option><option value="sql">SQL</option></select></div>
    <textarea aria-label="Shared code editor" spellCheck={false} value={code} onChange={(event) => updateCode(event.target.value.slice(0, 50000))} className="min-h-64 flex-1 resize-y bg-slate-950 p-4 font-mono text-sm leading-6 text-emerald-100 outline-none" />
    <div className="flex items-center justify-between border-t border-white/10 p-3"><span className="text-xs text-white/40">{code.length.toLocaleString()} / 50,000 characters</span><div className="flex gap-2"><button onClick={() => updateCode('')} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-white/70"><RotateCcw size={14} />Clear</button><button onClick={runCode} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white"><Play size={14} />Run</button></div></div>
    <pre aria-live="polite" className="max-h-36 min-h-10 overflow-auto border-t border-white/10 bg-black/30 p-3 text-xs text-emerald-200">{output}</pre>
    <iframe ref={frameRef} title="Isolated JavaScript output" sandbox="allow-scripts" className="hidden" />
  </section>
}
