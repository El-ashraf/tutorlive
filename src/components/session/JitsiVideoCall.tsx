'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface JitsiVideoCallProps {
  roomId: string
  userName: string
  userEmail?: string
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export default function JitsiVideoCall({
  roomId,
  userName,
  userEmail,
}: JitsiVideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const scriptId = 'jitsi-external-api-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement

    const initJitsi = () => {
      if (!containerRef.current || apiRef.current) return

      const domain = 'meet.jit.si'
      const options = {
        roomName: `TutorLive_${roomId}`,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName,
          email: userEmail || '',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          toolbarButtons: [
            'microphone',
            'camera',
            'desktop',
            'fullscreen',
            'chat',
            'raisehand',
            'tileview',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          DEFAULT_BACKGROUND: '#243149',
        },
      }

      try {
        const api = new window.JitsiMeetExternalAPI(domain, options)
        apiRef.current = api
        setLoading(false)

        api.addEventListener('videoConferenceJoined', () => {
          setLoading(false)
        })
      } catch (err) {
        console.error('Jitsi initialization error:', err)
        setLoading(false)
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      script.onload = initJitsi
      document.body.appendChild(script)
    } else if (window.JitsiMeetExternalAPI) {
      initJitsi()
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [roomId, userName, userEmail])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#243149] border border-[#344158]">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#243149] text-white z-10">
          <Loader2 size={32} className="animate-spin text-[#f29a63] mb-3" />
          <p className="text-sm font-medium text-[#aeb9c7]">Connecting to video call...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[350px]" />
    </div>
  )
}
