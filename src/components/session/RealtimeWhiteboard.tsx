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
}

export default function RealtimeWhiteboard({
  roomId,
  userId,
  userName,
}: RealtimeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'>('pen')
  const [color, setColor] = useState('#243149')
  const [size, setSize] = useState(4)

  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({})
  const channelRef = useRef<any>(null)

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
      drawStrokeOnContext(ctx, stroke)
    })
  }, [strokes])

  const drawStrokeOnContext = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#fbf8f1'
      ctx.lineWidth = stroke.size * 3
    } else if (stroke.tool === 'highlighter') {
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * 3
      ctx.globalAlpha = 0.35
    } else {
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.globalAlpha = 1.0
    }

    ctx.beginPath()
    const first = stroke.points[0]

    if (stroke.tool === 'line' && stroke.points.length >= 2) {
      const last = stroke.points[stroke.points.length - 1]
      ctx.moveTo(first.x, first.y)
      ctx.lineTo(last.x, last.y)
    } else if (stroke.tool === 'rect' && stroke.points.length >= 2) {
      const last = stroke.points[stroke.points.length - 1]
      const width = last.x - first.x
      const height = last.y - first.y
      ctx.strokeRect(first.x, first.y, width, height)
      ctx.restore()
      return
    } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
      const last = stroke.points[stroke.points.length - 1]
      const radius = Math.hypot(last.x - first.x, last.y - first.y)
      ctx.arc(first.x, first.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.restore()
      return
    } else {
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i]
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
        broadcast: { self: false },
      },
    })

    channel
      .on('broadcast', { event: 'DRAW_STROKE' }, ({ payload }) => {
        if (payload?.stroke) {
          setStrokes((prev) => [...prev, payload.stroke])
        }
      })
      .on('broadcast', { event: 'CLEAR_CANVAS' }, () => {
        setStrokes([])
        setRedoStack([])
      })
      .on('broadcast', { event: 'CURSOR_MOVE' }, ({ payload }) => {
        if (payload?.userId) {
          setRemoteCursors((prev) => ({
            ...prev,
            [payload.userId]: payload,
          }))
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

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
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCoordinates(e)
    if (!pt) return
    setIsDrawing(true)

    const newStroke: Stroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool,
      color,
      size,
      points: [pt],
    }

    currentStrokeRef.current = newStroke
    setStrokes((prev) => [...prev, newStroke])
    setRedoStack([])
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCoordinates(e)
    if (!pt) return

    if (channelRef.current) {
      channelRef.current.send({
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

    setStrokes((prev) =>
      prev.map((s) => (s.id === updatedStroke.id ? updatedStroke : s))
    )
  }

  const stopDrawing = () => {
    if (!isDrawing || !currentStrokeRef.current) return
    setIsDrawing(false)

    if (channelRef.current && currentStrokeRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'DRAW_STROKE',
        payload: { stroke: currentStrokeRef.current },
      })
    }

    currentStrokeRef.current = null
  }

  const handleUndo = () => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    setStrokes((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, last])
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const last = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setStrokes((prev) => [...prev, last])
  }

  const handleClear = () => {
    setStrokes([])
    setRedoStack([])
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'CLEAR_CANVAS',
      })
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `whiteboard-${roomId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
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

        {Object.values(remoteCursors).map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none transition-all duration-75 flex items-center gap-1 z-20"
            style={{ left: cursor.x, top: cursor.y }}
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
