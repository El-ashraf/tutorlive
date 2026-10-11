'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ArrowRight,
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
  tool: 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle'
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
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle'>('pen')
  const [color, setColor] = useState('#2563EB')
  const [size, setSize] = useState(6)

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
    '#2563EB',
    '#F43F5E',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#111827',
  ]

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bounds = canvas.getBoundingClientRect()
    const width = bounds.width
    const height = bounds.height
    if (!width || !height) return
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    ctx.fillStyle = '#fbf8f1'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#e5ded3'
    ctx.lineWidth = 0.5
    const gridSize = 30
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    strokes.forEach((stroke) => {
      drawStrokeOnContext(ctx, stroke, width, height)
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

    if ((stroke.tool === 'line' || stroke.tool === 'arrow') && points.length >= 2) {
      const last = points[points.length - 1]
      ctx.moveTo(first.x, first.y)
      ctx.lineTo(last.x, last.y)
      if (stroke.tool === 'arrow') {
        const angle = Math.atan2(last.y - first.y, last.x - first.x)
        const headLength = Math.max(8, Math.min(18, strokeSize * 6))
        const headAngle = Math.PI / 6
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(last.x - headLength * Math.cos(angle - headAngle), last.y - headLength * Math.sin(angle - headAngle))
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(last.x - headLength * Math.cos(angle + headAngle), last.y - headLength * Math.sin(angle + headAngle))
      }
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

  const redrawRef = useRef(redraw)
  redrawRef.current = redraw

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const resizeCanvas = () => {
      const bounds = parent.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)
      const width = Math.max(1, Math.round(bounds.width * pixelRatio))
      const height = Math.max(1, Math.round(bounds.height * pixelRatio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      redrawRef.current()
    }

    resizeCanvas()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeCanvas)
    observer?.observe(parent)
    window.addEventListener('resize', resizeCanvas)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

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
    <div className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden" style={{ background: '#fbf8f1', border: '1px solid rgba(37,99,235,0.15)' }}>
      <div className="z-10 flex flex-col items-stretch gap-1 px-2 py-1 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3" style={{ background: 'var(--navy-light)', borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl p-1 sm:w-auto" style={{ background: 'var(--navy)' }}>
          {[
            { id: 'pen', icon: Pencil, label: 'Pen' },
            { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
            { id: 'line', icon: Minus, label: 'Line' },
            { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
            { id: 'rect', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: CircleIcon, label: 'Circle' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id as any)}
              title={label}
              aria-label={label}
              aria-pressed={tool === id}
              className={`min-h-8 min-w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all sm:min-h-10 sm:min-w-10 ${
                tool === id
                  ? 'shadow-sm'
                  : 'hover:bg-white/10'
              }`}
              style={tool === id ? { background: 'var(--cobalt)', color: '#fff' } : { color: 'var(--text-muted)' }}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-1 sm:justify-center">
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Set pen color ${c}`}
              aria-pressed={color === c}
              className={`h-6 w-6 shrink-0 rounded-full border transition-transform sm:h-6 sm:w-6 ${
                color === c ? 'scale-125 ring-2' : 'hover:scale-110'
              }`}
              style={{ background: c, borderColor: 'rgba(255,255,255,0.1)', ...(color === c ? { boxShadow: '0 0 0 2px var(--cobalt-bright)' } : {}) }}
            />
          ))}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Size</span>
          <input
            type="range"
            aria-label="Pen size"
            min="2"
            max="24"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-16 cursor-pointer sm:w-20"
            style={{ accentColor: 'var(--cobalt-bright)' }}
          />
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:flex-1">
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => handleSetPage(currentPage - 1)}
              disabled={!isTutor || currentPage === 0}
              aria-label="Previous whiteboard page"
              className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 sm:min-h-9 sm:min-w-9"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="whitespace-nowrap text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }} aria-label={`Page ${currentPage + 1} of ${pageCount}`}>
              <span className="sm:hidden">{currentPage + 1}/{pageCount}</span>
              <span className="hidden sm:inline">Page {currentPage + 1} of {pageCount}</span>
            </span>
            <button
              type="button"
              onClick={() => handleSetPage(currentPage + 1)}
              disabled={!isTutor || currentPage >= pageCount - 1}
              aria-label="Next whiteboard page"
              className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 sm:min-h-9 sm:min-w-9"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronRight size={16} />
            </button>
            {isTutor ? (
              <button
                type="button"
                onClick={handleAddPage}
                disabled={pageCount >= 100}
                aria-label="Add whiteboard page"
                title="New page"
                className="flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-white disabled:opacity-40 sm:min-h-9 sm:px-2"
                style={{ background: 'var(--cobalt)' }}
              >
                <Plus size={14} /><span className="hidden sm:inline">New page</span>
              </button>
            ) : (
              <span className="whitespace-nowrap px-1 text-[9px] text-white/60 sm:px-2 sm:text-xs" aria-label="Following teacher">
                <span className="sm:hidden">Live</span><span className="hidden sm:inline">Following teacher</span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 border-l pl-1 sm:gap-1 sm:pl-3" style={{ borderColor: 'rgba(37,99,235,0.15)' }}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo"
            aria-label="Undo"
            className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 sm:min-h-10 sm:min-w-10"
            style={{ color: 'var(--text-muted)' }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
            aria-label="Redo"
            className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 sm:min-h-10 sm:min-w-10"
            style={{ color: 'var(--text-muted)' }}
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            onClick={handleClear}
            title="Clear Board"
            aria-label="Clear board"
            className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-red-500/10 sm:min-h-10 sm:min-w-10"
            style={{ color: 'var(--rose-bright)' }}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Save Image"
            aria-label="Save board page as image"
            className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-white/10 sm:min-h-10 sm:min-w-10"
            style={{ color: 'var(--text-muted)' }}
          >
            <Download size={16} />
          </button>
          </div>
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
          <div className="absolute bottom-2 left-2 rounded px-2 py-1 text-[10px]" style={{ background: 'rgba(10,14,20,0.9)', color: 'var(--text-muted)' }}>
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
            <div className="w-3 h-3 rounded-full border-2 border-white shadow-md" style={{ background: 'var(--cobalt-bright)' }} />
            <span className="text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm font-semibold" style={{ background: 'var(--navy-light)' }}>
              {cursor.userName}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
