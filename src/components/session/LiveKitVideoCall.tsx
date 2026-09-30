'use client'

import { useEffect, useState } from 'react'
import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from '@livekit/components-react'
import { isRemoteParticipant, Track } from 'livekit-client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface LiveKitVideoCallProps {
  roomId: string
  userName: string
  isTutor: boolean
}

const STUDENTS_PER_PAGE = 6

function ClassroomTracks({ isTutor }: { isTutor: boolean }) {
  const [studentPage, setStudentPage] = useState(0)
  const participants = useParticipants()
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
  const screenTracks = useTracks([Track.Source.ScreenShare])

  const teacher = participants.find((participant) => {
    try {
      return JSON.parse(participant.metadata || '{}').role === 'TUTOR'
    } catch {
      return false
    }
  })
  const local = participants.find((participant) => participant.isLocal)
  const teacherId = teacher?.identity ?? (isTutor ? local?.identity : undefined)
  const teacherCamera = cameraTracks.find((track) => track.participant.identity === teacherId)
  const featuredTrack = screenTracks.find((track) => track.participant.identity === teacherId) ?? teacherCamera
  const studentParticipants = participants.filter((participant) => participant.identity !== teacherId)
  const pageCount = Math.max(1, Math.ceil(studentParticipants.length / STUDENTS_PER_PAGE))
  const pageStudents = studentParticipants.slice(studentPage * STUDENTS_PER_PAGE, (studentPage + 1) * STUDENTS_PER_PAGE)
  const pageStudentIds = new Set(pageStudents.map((participant) => participant.identity))
  const studentTracks = pageStudents.flatMap((participant) => {
    const screen = screenTracks.find((track) => track.participant.identity === participant.identity)
    const camera = cameraTracks.find((track) => track.participant.identity === participant.identity)
    return screen ?? camera ? [screen ?? camera!] : []
  })

  useEffect(() => {
    if (studentPage >= pageCount) setStudentPage(Math.max(0, pageCount - 1))
  }, [pageCount, studentPage])

  useEffect(() => {
    const visibleIds = new Set(pageStudentIds)
    if (teacherId) visibleIds.add(teacherId)
    participants.forEach((participant) => {
      if (!isRemoteParticipant(participant)) return
      participant.videoTrackPublications.forEach((publication) => {
        publication.setSubscribed(visibleIds.has(participant.identity))
      })
    })
  }, [pageStudentIds, participants, teacherId])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 bg-[#182030] p-2">
      <div className="min-h-0 flex-[3] overflow-hidden rounded-xl border border-[#344158] bg-[#243149]">
        {featuredTrack ? (
          <ParticipantTile trackRef={featuredTrack} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#aeb9c7]">
            Waiting for the teacher to join…
          </div>
        )}
      </div>
          <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto">
        {studentTracks.map((track) => (
          <div key={`${track.participant.identity}-${track.source}`} className="aspect-video h-full min-w-32 overflow-hidden rounded-xl border border-[#344158] bg-[#243149]">
            <ParticipantTile trackRef={track} className="h-full w-full" />
          </div>
        ))}
            {studentTracks.length === 0 && studentParticipants.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-[#aeb9c7]">
            Students can turn on their cameras whenever they want.
          </div>
        )}
      </div>
          {studentParticipants.length > STUDENTS_PER_PAGE && (
            <div className="flex shrink-0 items-center justify-center gap-2 text-[10px] text-[#aeb9c7]">
              <button
                type="button"
                onClick={() => setStudentPage((page) => Math.max(0, page - 1))}
                disabled={studentPage === 0}
                aria-label="Previous students"
                className="rounded p-1 disabled:opacity-40"
              ><ChevronLeft size={16} /></button>
              <span>Students {studentPage * STUDENTS_PER_PAGE + 1}–{Math.min((studentPage + 1) * STUDENTS_PER_PAGE, studentParticipants.length)} of {studentParticipants.length}</span>
              <button
                type="button"
                onClick={() => setStudentPage((page) => Math.min(pageCount - 1, page + 1))}
                disabled={studentPage >= pageCount - 1}
                aria-label="Next students"
                className="rounded p-1 disabled:opacity-40"
              ><ChevronRight size={16} /></button>
            </div>
          )}
    </div>
  )
}

export default function LiveKitVideoCall({ roomId, userName, isTutor }: LiveKitVideoCallProps) {
  const [token, setToken] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Preparing classroom…')

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      try {
        const response = await fetch(`/api/livekit/token?roomId=${encodeURIComponent(roomId)}`, {
          cache: 'no-store',
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not authorize classroom access.')
        if (!mounted) return
        setToken(result.token)
        setServerUrl(result.serverUrl)
        setStatus('Connecting to live classroom…')
      } catch (cause) {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Could not connect to the live classroom.')
        setStatus('Classroom unavailable')
      }
    }

    void connect()
    return () => { mounted = false }
  }, [roomId])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#344158] bg-[#1e273a]" data-lk-theme="default">
      {error ? (
        <div role="alert" className="flex flex-1 items-center justify-center p-5 text-center text-sm text-red-200">
          {error}
        </div>
      ) : token && serverUrl ? (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect
          audio={isTutor}
          video={isTutor}
          options={{ adaptiveStream: true, dynacast: true }}
          onConnected={() => setStatus('Connected')}
          onDisconnected={() => setStatus('Reconnecting…')}
          onError={(cause) => {
            console.error('LiveKit classroom error:', cause)
            setError('The video classroom could not connect. Check the LiveKit server settings and try again.')
          }}
          className="flex h-full min-h-0 flex-col"
        >
          <ClassroomTracks isTutor={isTutor} />
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-t border-[#344158] bg-[#243149] px-3">
            <span className="truncate text-[10px] text-[#aeb9c7]">{status} · {userName}</span>
            <ControlBar
              variation="minimal"
              controls={{ microphone: true, camera: true, screenShare: true, leave: false }}
            />
          </div>
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-[#aeb9c7]">{status}</div>
      )}
    </div>
  )
}
