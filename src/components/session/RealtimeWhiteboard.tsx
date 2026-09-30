'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Pencil,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Highlighter,
  Square,
  Circle as CircleIcon,
  Minus,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
} from 'lucide-react'

interface Point {
  x: number
  y: number
}

interface Stroke {
  id: string
  tool: 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'
  color: string
  size: number
  points: Point[]
}

interface RemoteCursor {
  userId: string
  userName: string
  x: number
  y: number
}

interface RealtimeWhiteboardProps {
  roomId: string
  userId: string
  userName: string
  isTutor: boolean
}

export default function RealtimeWhiteboard({
  roomId,
  userId,
  userName,
  isTutor,
}: RealtimeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'>('pen')
  const [color, setColor] = useState('#243149')
  const [size, setSize] = useState(4)

  const [pages, setPages] = useState<Record<number, Stroke[]>>({ 0: [] })
  const [currentPage, setCurrentPage] = useState(0)
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({})
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING')
  const channelRef = useRef<any>(null)
  const pagesRef = useRef<Record<number, Stroke[]>>({ 0: [] })
  const currentPageRef = useRef(0)
  const strokes = pages[currentPage] ?? []
  const pageCount = Math.max(1, ...Object.keys(pages).map((page) => Number(page) + 1))

  const updatePageStrokes = useCallback((page: number, update: (current: Stroke[]) => Stroke[]) => {
    const nextPages = {
      ...pagesRef.current,
      [page]: update(pagesRef.current[page] ?? []),
    }
    pagesRef.current = nextPages
    setPages(nextPages)
  }, [])

  const colors = [
    '#243149',
    '#f29a63',
    '#ef4444',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ffffff',
  ]

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#fbf8f1'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#e5ded3'
    ctx.lineWidth = 0.5
    const gridSize = 30
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    strokes.forEach((stroke) => {
      drawStrokeOnContext(ctx, stroke, canvas.width, canvas.height)
    })
  }, [strokes])

  const drawStrokeOnContext = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    if (stroke.points.length === 0) return

    const points = stroke.points.map((point) => ({
      x: point.x * canvasWidth,
      y: point.y * canvasHeight,
    }))
    const strokeSize = stroke.size * canvasWidth / 1000

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#fbf8f1'
      ctx.lineWidth = strokeSize * 3
    } else if (stroke.tool === 'highlighter') {
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = strokeSize * 3
      ctx.globalAlpha = 0.35
    } else {
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = strokeSize
      ctx.globalAlpha = 1.0
    }

    ctx.beginPath()
    const first = points[0]

    if (stroke.tool === 'line' && points.length >= 2) {
      const last = points[points.length - 1]
      ctx.moveTo(first.x, first.y)
      ctx.lineTo(last.x, last.y)
    } else if (stroke.tool === 'rect' && points.length >= 2) {
      const last = points[points.length - 1]
      const width = last.x - first.x
      const height = last.y - first.y
      ctx.strokeRect(first.x, first.y, width, height)
      ctx.restore()
      return
    } else if (stroke.tool === 'circle' && points.length >= 2) {
      const last = points[points.length - 1]
      const radius = Math.hypot(last.x - first.x, last.y - first.y)
      ctx.arc(first.x, first.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.restore()
      return
    } else {
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < points.length; i++) {
        const pt = points[i]
        ctx.lineTo(pt.x, pt.y)
      }
    }

    ctx.stroke()
    ctx.restore()
  }

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !canvas.parentElement) return
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
      redraw()
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [redraw])

  useEffect(() => {
    const channel = supabase.channel(`whiteboard:${roomId}`, {
      config: {
        broadcast: { self: false, ack: true },
      },
    })

    channel
      .on('broadcast', { event: 'DRAW_STROKE' }, ({ payload }) => {
        if (payload?.stroke?.id) {
          const page = Number.isInteger(payload.page) ? payload.page : 0
          const current = pagesRef.current[page] ?? []
          if (current.some((stroke) => stroke.id === payload.stroke.id)) return
          const nextPages = { ...pagesRef.current, [page]: [...current, payload.stroke] }
          pagesRef.current = nextPages
          setPages(nextPages)
        }
      })
      .on('broadcast', { event: 'REMOVE_STROKE' }, ({ payload }) => {
        if (payload?.strokeId) {
          const page = Number.isInteger(payload.page) ? payload.page : 0
          updatePageStrokes(page, (current) => current.filter((stroke) => stroke.id !== payload.strokeId))
        }
      })
      .on('broadcast', { event: 'CLEAR_CANVAS' }, ({ payload }) => {
        const page = Number.isInteger(payload?.page) ? payload.page : 0
        updatePageStrokes(page, () => [])
        setRedoStack([])
      })
      .on('broadcast', { event: 'PAGE_ADDED' }, ({ payload }) => {
        const page = payload?.page
        if (!Number.isInteger(page) || page < 1 || page > 99) return
        const nextPages = { ...pagesRef.current }
        for (let index = 0; index <= page; index++) nextPages[index] ??= []
        pagesRef.current = nextPages
        setPages(nextPages)
        currentPageRef.current = page
        setCurrentPage(page)
        setRedoStack([])
      })
      .on('broadcast', { event: 'PAGE_CHANGED' }, ({ payload }) => {
        const page = payload?.page
        if (isTutor || !Number.isInteger(page) || page < 0 || page > 99) return
        const nextPages = { ...pagesRef.current }
        for (let index = 0; index <= page; index++) nextPages[index] ??= []
        pagesRef.current = nextPages
        setPages(nextPages)
        currentPageRef.current = page
        setCurrentPage(page)
        setRedoStack([])
      })
      .on('broadcast', { event: 'REQUEST_CANVAS_SYNC' }, ({ payload }) => {
        if (isTutor && payload?.userId && payload.userId !== userId) {
          void channel.send({
            type: 'broadcast',
            event: 'SYNC_CANVAS_STATE',
            payload: {
              targetUserId: payload.userId,
              pages: pagesRef.current,
              currentPage: currentPageRef.current,
            },
          })
        }
      })
      .on('broadcast', { event: 'SYNC_CANVAS_STATE' }, ({ payload }) => {
        if (payload?.pages && (payload.targetUserId === userId || payload.targetUserId === '*')) {
          const nextPages = { ...(payload.pages as Record<number, Stroke[]>) }
          const page = Number.isInteger(payload.currentPage) ? payload.currentPage : 0
          nextPages[0] ??= []
          pagesRef.current = nextPages
          setPages(nextPages)
          currentPageRef.current = page
          setCurrentPage(page)
          setRedoStack([])
        }
      })
      .on('broadcast', { event: 'CURSOR_MOVE' }, ({ payload }) => {
        if (payload?.userId) {
          setRemoteCursors((prev) => ({
            ...prev,
            [payload.userId]: payload,
          }))
        }
      })
      .subscribe((status) => {
        setRealtimeStatus(status)
        if (status !== 'SUBSCRIBED') return

        if (isTutor) {
          void channel.send({
            type: 'broadcast',
            event: 'SYNC_CANVAS_STATE',
            payload: {
              targetUserId: '*',
              pages: pagesRef.current,
              currentPage: currentPageRef.current,
            },
          })
        } else {
          void channel.send({
            type: 'broadcast',
            event: 'REQUEST_CANVAS_SYNC',
            payload: { userId },
          })
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isTutor, roomId, updatePageStrokes, userId])

  useEffect(() => {
    redraw()
  }, [strokes, redraw])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCoordinates(e)
    if (!pt) return
    setIsDrawing(true)

    const newStroke: Stroke = {
      id: crypto.randomUUID(),
      tool,
      color,
      size,
      points: [pt],
    }

    currentStrokeRef.current = newStroke
    updatePageStrokes(currentPage, (current) => [...current, newStroke])
    setRedoStack([])
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCoordinates(e)
    if (!pt) return

    if (channelRef.current && realtimeStatus === 'SUBSCRIBED') {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'CURSOR_MOVE',
        payload: { userId, userName, x: pt.x, y: pt.y },
      })
    }

    if (!isDrawing || !currentStrokeRef.current) return

    const updatedStroke = {
      ...currentStrokeRef.current,
      points: [...currentStrokeRef.current.points, pt],
    }
    currentStrokeRef.current = updatedStroke

    updatePageStrokes(currentPage, (current) =>
      current.map((stroke) => (stroke.id === updatedStroke.id ? updatedStroke : stroke)),
    )
  }

  const stopDrawing = () => {
    if (!isDrawing || !currentStrokeRef.current) return
    setIsDrawing(false)

    if (channelRef.current && realtimeStatus === 'SUBSCRIBED' && currentStrokeRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'DRAW_STROKE',
        payload: { page: currentPageRef.current, stroke: currentStrokeRef.current },
      })
    }

    currentStrokeRef.current = null
  }

  const handleUndo = () => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    updatePageStrokes(currentPage, (current) => current.slice(0, -1))
    setRedoStack((prev) => [...prev, last])
    if (channelRef.current && realtimeStatus === 'SUBSCRIBED') {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'REMOVE_STROKE',
        payload: { page: currentPage, strokeId: last.id },
      })
    }
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const last = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    updatePageStrokes(currentPage, (current) => [...current, last])
    if (channelRef.current && realtimeStatus === 'SUBSCRIBED') {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'DRAW_STROKE',
        payload: { page: currentPage, stroke: last },
      })
    }
  }

  const handleClear = () => {
    updatePageStrokes(currentPage, () => [])
    setRedoStack([])
    if (channelRef.current && realtimeStatus === 'SUBSCRIBED') {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'CLEAR_CANVAS',
        payload: { page: currentPage },
      })
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `whiteboard-${roomId}-page-${currentPage + 1}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleSetPage = (page: number) => {
    if (!isTutor || page < 0 || page >= pageCount || page === currentPage) return
    setIsDrawing(false)
    currentStrokeRef.current = null
    currentPageRef.current = page
    setCurrentPage(page)
    setRedoStack([])
    if (channelRef.current && realtimeStatus === 'SUBSCRIBED') {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'PAGE_CHANGED',
        payload: { page },
      })
    }
  }

  const handleAddPage = () => {
    if (!isTutor || pageCount >= 100) return
    const page = pageCount
    const nextPages = { ...pagesRef.current, [page]: [] }
    pagesRef.current = nextPages
    setPages(nextPages)
    setIsDrawing(false)
    currentStrokeRef.current = null
    currentPageRef.current = page
    setCurrentPage(page)
    setRedoStack([])
    if (channelRef.current && realtimeStatus === 'SUBSCRIBED') {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'PAGE_ADDED',
        payload: { page },
      })
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[#fbf8f1] rounded-2xl overflow-hidden border border-[#e5ded3]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[#e5ded3] z-10 shadow-sm">
        <div className="flex items-center gap-1 bg-[#f3ede2] p-1 rounded-xl">
          {[
            { id: 'pen', icon: Pencil, label: 'Pen' },
            { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
            { id: 'line', icon: Minus, label: 'Line' },
            { id: 'rect', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: CircleIcon, label: 'Circle' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id as any)}
              title={label}
              className={`min-h-10 min-w-10 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                tool === id
                  ? 'bg-[#243149] text-[#f29a63] shadow-sm'
                  : 'text-[#243149] hover:bg-white/60'
              }`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 sm:w-6 sm:h-6 shrink-0 rounded-full border transition-transform ${
                color === c ? 'scale-125 ring-2 ring-[#243149]' : 'hover:scale-110'
              }`}
              style={{ background: c, borderColor: '#e5ded3' }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#8a8680]">Size</span>
          <input
            type="range"
            min="2"
            max="24"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-20 accent-[#f29a63] cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-1 border-l border-[#e5ded3] pl-2">
          <button
            type="button"
            onClick={() => handleSetPage(currentPage - 1)}
            disabled={!isTutor || currentPage === 0}
            aria-label="Previous whiteboard page"
            className="min-h-9 min-w-9 flex items-center justify-center rounded-lg text-[#243149] hover:bg-[#f3ede2] disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="whitespace-nowrap text-[10px] font-semibold text-[#5e5b55]">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => handleSetPage(currentPage + 1)}
            disabled={!isTutor || currentPage >= pageCount - 1}
            aria-label="Next whiteboard page"
            className="min-h-9 min-w-9 flex items-center justify-center rounded-lg text-[#243149] hover:bg-[#f3ede2] disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
          {isTutor ? (
            <button
              type="button"
              onClick={handleAddPage}
              disabled={pageCount >= 100}
              className="flex min-h-9 items-center gap-1 rounded-lg bg-[#243149] px-2 text-[10px] font-semibold text-white disabled:opacity-40"
            >
              <Plus size={14} /> New page
            </button>
          ) : (
            <span className="whitespace-nowrap text-[9px] text-[#8a8680]">Following teacher</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-l border-[#e5ded3] pl-3">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo"
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-[#243149] hover:bg-[#f3ede2] disabled:opacity-30"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-[#243149] hover:bg-[#f3ede2] disabled:opacity-30"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={handleClear}
            title="Clear Board"
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={handleDownload}
            title="Save Image"
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-[#243149] hover:bg-[#f3ede2]"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
        />

        {realtimeStatus !== 'SUBSCRIBED' && (
          <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] text-[#6b6257]">
            {['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(realtimeStatus)
              ? `Whiteboard disconnected (${realtimeStatus}). Check Supabase Realtime.`
              : 'Connecting whiteboard…'}
          </div>
        )}

        {Object.values(remoteCursors).map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none transition-all duration-75 flex items-center gap-1 z-20"
            style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
          >
            <div className="w-3 h-3 bg-[#f29a63] rounded-full border-2 border-white shadow-md" />
            <span className="bg-[#243149] text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm font-semibold">
              {cursor.userName}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
