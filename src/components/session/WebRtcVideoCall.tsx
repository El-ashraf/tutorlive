'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  User,
} from 'lucide-react'

interface WebRtcVideoCallProps {
  roomId: string
  userId: string
  userName: string
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export default function WebRtcVideoCall({
  roomId,
  userId,
  userName,
}: WebRtcVideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<any>(null)

  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [remoteUserName, setRemoteUserName] = useState<string>('Remote Participant')

  useEffect(() => {
    let isMounted = true

    async function initMediaAndSignaling() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (!isMounted) return
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        const pc = new RTCPeerConnection(ICE_SERVERS)
        peerRef.current = pc

        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setRemoteConnected(true)
          }
        }

        const channel = supabase.channel(`signal:${roomId}`, {
          config: { broadcast: { self: false } },
        })

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ICE_CANDIDATE',
              payload: { candidate: event.candidate, senderId: userId },
            })
          }
        }

        channel
          .on('broadcast', { event: 'OFFER' }, async ({ payload }) => {
            if (payload.senderId === userId) return
            setRemoteUserName(payload.senderName || 'Participant')
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            channel.send({
              type: 'broadcast',
              event: 'ANSWER',
              payload: { answer, senderId: userId },
            })
          })
          .on('broadcast', { event: 'ANSWER' }, async ({ payload }) => {
            if (payload.senderId === userId) return
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
            setRemoteConnected(true)
          })
          .on('broadcast', { event: 'ICE_CANDIDATE' }, async ({ payload }) => {
            if (payload.senderId === userId) return
            try {
              if (payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
              }
            } catch (err) {
              console.warn('Error adding ICE candidate:', err)
            }
          })
          .on('broadcast', { event: 'JOIN_ANNOUNCE' }, async ({ payload }) => {
            if (payload.senderId === userId) return
            setRemoteUserName(payload.senderName || 'Participant')
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            channel.send({
              type: 'broadcast',
              event: 'OFFER',
              payload: { offer, senderId: userId, senderName: userName },
            })
          })

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'JOIN_ANNOUNCE',
              payload: { senderId: userId, senderName: userName },
            })
          }
        })

        channelRef.current = channel
      } catch (err) {
        console.error('Media initialization error:', err)
      }
    }

    initMediaAndSignaling()

    return () => {
      isMounted = false
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (peerRef.current) {
        peerRef.current.close()
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomId, userId, userName])

  const toggleMic = () => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicOn(audioTrack.enabled)
    }
  }

  const toggleCam = () => {
    if (!localStreamRef.current) return
    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCamOn(videoTrack.enabled)
    }
  }

  const toggleScreenShare = async () => {
    if (!peerRef.current || !localStreamRef.current) return

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        })
        const screenTrack = screenStream.getVideoTracks()[0]

        const sender = peerRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video')

        if (sender) {
          sender.replaceTrack(screenTrack)
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        screenTrack.onended = () => {
          stopScreenShare()
        }

        setIsScreenSharing(true)
      } catch (err) {
        console.error('Screen share error:', err)
      }
    } else {
      stopScreenShare()
    }
  }

  const stopScreenShare = () => {
    if (!peerRef.current || !localStreamRef.current) return
    const origVideoTrack = localStreamRef.current.getVideoTracks()[0]
    const sender = peerRef.current
      .getSenders()
      .find((s) => s.track?.kind === 'video')

    if (sender && origVideoTrack) {
      sender.replaceTrack(origVideoTrack)
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }

    setIsScreenSharing(false)
  }

  return (
    <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden relative" style={{ background: 'var(--navy)', border: '1px solid rgba(37,99,235,0.15)' }}>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 relative overflow-hidden" style={{ background: 'var(--navy)' }}>
        <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${remoteConnected ? 'block' : 'hidden'}`}
          />
          {!remoteConnected && (
            <div className="flex flex-col items-center justify-center text-center p-4" style={{ color: 'var(--text-muted)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--navy-card)' }}>
                <User size={32} style={{ color: 'var(--cobalt-bright)' }} />
              </div>
              <p className="text-xs font-semibold text-white">Waiting for participant...</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Share room link to connect</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-semibold">
            {remoteConnected ? remoteUserName : 'Waiting...'}
          </div>
        </div>

        <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--navy-light)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCamOn ? 'block' : 'hidden'}`}
          />
          {!isCamOn && (
            <div className="flex flex-col items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--navy-card)' }}>
                <VideoOff size={24} className="text-red-400" />
              </div>
              <p className="text-xs font-semibold">Camera Turned Off</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1">
            <span>You ({userName})</span>
            {isScreenSharing && <span className="font-bold" style={{ color: 'var(--cobalt-bright)' }}>· Sharing Screen</span>}
          </div>
        </div>
      </div>

      <div className="h-14 px-4 flex items-center justify-center gap-3" style={{ background: 'var(--navy-light)', borderTop: '1px solid rgba(37,99,235,0.15)' }}>
        <button
          onClick={toggleMic}
          className={`p-2.5 rounded-full transition-all ${
            isMicOn ? 'text-white' : 'bg-red-500 text-white'
          }`}
          style={isMicOn ? { background: 'var(--navy-card)' } : {}}
          title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          onClick={toggleCam}
          className={`p-2.5 rounded-full transition-all ${
            isCamOn ? 'text-white' : 'bg-red-500 text-white'
          }`}
          style={isCamOn ? { background: 'var(--navy-card)' } : {}}
          title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCamOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
        </button>

        <button
          onClick={toggleScreenShare}
          className="p-2.5 rounded-full transition-all"
          style={isScreenSharing ? { background: 'var(--cobalt)', color: '#fff' } : { background: 'var(--navy-card)', color: '#fff' }}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
        </button>
      </div>
    </div>
  )
}
