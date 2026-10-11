'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as PointerEventType } from 'react'
import type { FFmpeg as FFmpegInstance } from '@ffmpeg/ffmpeg'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  deleteSavedRecording,
  getSavedRecording,
  listSavedRecordings,
  saveRecording as persistRecording,
  type SavedRecordingMetadata,
} from '@/lib/recording-storage'
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  FileText,
  LoaderCircle,
  Mic,
  MicOff,
  MonitorUp,
  Pen,
  Square,
  Trash2,
  Upload,
  Video,
  VideoOff,
} from 'lucide-react'

type Point = { x: number; y: number }
type Stroke = { color: string; width: number; tool: 'pen' | 'eraser'; space: 'slide' | 'stage'; points: Point[] }
type SlideRect = { x: number; y: number; width: number; height: number }
type SlideVisual = HTMLImageElement | HTMLCanvasElement
type SlideItem =
  | { id: string; label: string; kind: 'image'; visual: HTMLImageElement; url: string }
  | { id: string; label: string; kind: 'pdf'; documentId: string; pageNumber: number }
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (source: { data: Uint8Array }) => { promise: Promise<PDFDocumentProxy> }
}

const STAGE_WIDTH = 1280
const STAGE_HEIGHT = 720
const PEN_COLORS = ['#ffffff', '#facc15', '#fb7185', '#38bdf8', '#4ade80']

function errorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Screen sharing was cancelled or permission was denied.'
    if (error.name === 'NotFoundError') return 'No screen or window is available to share.'
  }
  return error instanceof Error ? error.message : 'Could not start the recording studio.'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function getContainedVisualRect(visual: SlideVisual, zoom: number, scroll: Point): SlideRect | null {
  const sourceWidth = 'naturalWidth' in visual ? visual.naturalWidth : visual.width
  const sourceHeight = 'naturalHeight' in visual ? visual.naturalHeight : visual.height
  if (!sourceWidth || !sourceHeight) return null
  const scale = Math.min(STAGE_WIDTH / sourceWidth, STAGE_HEIGHT / sourceHeight) * zoom
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return {
    x: (width < STAGE_WIDTH ? (STAGE_WIDTH - width) / 2 : 0) - scroll.x,
    y: (height < STAGE_HEIGHT ? (STAGE_HEIGHT - height) / 2 : 0) - scroll.y,
    width,
    height,
  }
}

function drawContainedVisual(context: CanvasRenderingContext2D, visual: SlideVisual, zoom: number, scroll: Point) {
  const rect = getContainedVisualRect(visual, zoom, scroll)
  if (rect) context.drawImage(visual, rect.x, rect.y, rect.width, rect.height)
  return rect
}

export default function RecordingStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const slideScrollerRef = useRef<HTMLDivElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const slidesInputRef = useRef<HTMLInputElement>(null)
  const slideVisualRef = useRef<SlideVisual | null>(null)
  const pdfDocumentsRef = useRef<Map<string, PDFDocumentProxy>>(new Map())
  const imageUrlsRef = useRef<Set<string>>(new Set())
  const pdfRenderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const slideStrokesRef = useRef<Map<string, Stroke[]>>(new Map())
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const ffmpegRef = useRef<FFmpegInstance | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const strokesRef = useRef<Stroke[]>([])
  const drawingStrokeRef = useRef<Stroke | null>(null)
  const titleRef = useRef('Untitled lesson')
  const recordingStartedAtRef = useRef<number | null>(null)
  const manualZoomRef = useRef(false)
  const slideScrollRef = useRef<Point>({ x: 0, y: 0 })
  const [title, setTitle] = useState('Untitled lesson')
  const [sourceMode, setSourceMode] = useState<'slides' | 'screen'>('slides')
  const [slides, setSlides] = useState<SlideItem[]>([])
  const [slideIndex, setSlideIndex] = useState(0)
  const [slidesLoading, setSlidesLoading] = useState(false)
  const [screenReady, setScreenReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | null>(null)
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penSize, setPenSize] = useState(5)
  const [slideZoom, setSlideZoom] = useState(1)
  const [slideVisualVersion, setSlideVisualVersion] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null)
  const [savedRecordings, setSavedRecordings] = useState<SavedRecordingMetadata[]>([])
  const [loadingSavedRecordings, setLoadingSavedRecordings] = useState(true)
  const [openingRecordingId, setOpeningRecordingId] = useState<string | null>(null)
  const [savingRecording, setSavingRecording] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [recordedFormat, setRecordedFormat] = useState<'mp4' | 'webm' | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [exportingMp4, setExportingMp4] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const releaseMedia = useCallback(() => {
    for (const stream of [screenStreamRef.current, cameraStreamRef.current, microphoneStreamRef.current]) {
      stream?.getTracks().forEach((track) => track.stop())
    }
    screenStreamRef.current = null
    cameraStreamRef.current = null
    microphoneStreamRef.current = null
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
    const context = audioContextRef.current
    audioContextRef.current = null
    audioDestinationRef.current = null
    if (context && context.state !== 'closed') void context.close()
    setScreenReady(false)
  }, [])

  useEffect(() => {
    let frameId = 0
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const annotationCanvas = document.createElement('canvas')
    annotationCanvas.width = STAGE_WIDTH
    annotationCanvas.height = STAGE_HEIGHT
    annotationCanvasRef.current = annotationCanvas
    const annotationContext = annotationCanvas.getContext('2d')
    if (!annotationContext) return

    const drawVideo = (video: HTMLVideoElement, x: number, y: number, width: number, height: number, fit: 'cover' | 'contain' = 'cover') => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return
      if (fit === 'contain') {
        const scale = Math.min(width / video.videoWidth, height / video.videoHeight)
        const drawnWidth = video.videoWidth * scale
        const drawnHeight = video.videoHeight * scale
        context.drawImage(video, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight)
      } else {
        const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
        const cropWidth = width / scale
        const cropHeight = height / scale
        const cropX = (video.videoWidth - cropWidth) / 2
        const cropY = (video.videoHeight - cropHeight) / 2
        context.drawImage(video, cropX, cropY, cropWidth, cropHeight, x, y, width, height)
      }
    }

    const draw = () => {
      context.fillStyle = '#0b1220'
      context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
      const screenVideo = screenVideoRef.current
      if (sourceMode === 'screen' && screenVideo) drawVideo(screenVideo, 0, 0, STAGE_WIDTH, STAGE_HEIGHT, 'contain')
      else if (sourceMode === 'slides' && slideVisualRef.current) drawContainedVisual(context, slideVisualRef.current, slideZoom, slideScrollRef.current)
      else {
        const gradient = context.createLinearGradient(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
        gradient.addColorStop(0, '#172554')
        gradient.addColorStop(1, '#0b1220')
        context.fillStyle = gradient
        context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
        context.fillStyle = '#e2e8f0'
        context.textAlign = 'center'
        context.font = '600 30px system-ui, sans-serif'
        context.fillText(sourceMode === 'slides' ? 'Upload a PDF or slide images' : 'Your shared screen will appear here', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 8)
        context.fillStyle = '#94a3b8'
        context.font = '20px system-ui, sans-serif'
        context.fillText(sourceMode === 'slides' ? 'Choose a file to show and record your slides' : 'Share a screen, window, or browser tab', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 32)
      }

      const cameraVideo = cameraVideoRef.current
      if (cameraOn && cameraVideo && cameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const cameraWidth = 256
        const cameraHeight = 144
        const margin = 28
        context.save()
        context.beginPath()
        context.roundRect(STAGE_WIDTH - cameraWidth - margin, STAGE_HEIGHT - cameraHeight - margin, cameraWidth, cameraHeight, 18)
        context.clip()
        drawVideo(cameraVideo, STAGE_WIDTH - cameraWidth - margin, STAGE_HEIGHT - cameraHeight - margin, cameraWidth, cameraHeight)
        context.restore()
        context.strokeStyle = 'rgba(255,255,255,0.85)'
        context.lineWidth = 3
        context.beginPath()
        context.roundRect(STAGE_WIDTH - cameraWidth - margin, STAGE_HEIGHT - cameraHeight - margin, cameraWidth, cameraHeight, 18)
        context.stroke()
      }

      annotationContext.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
      const slideRect = sourceMode === 'slides' && slideVisualRef.current
        ? getContainedVisualRect(slideVisualRef.current, slideZoom, slideScrollRef.current)
        : null
      for (const stroke of strokesRef.current) {
        if (stroke.points.length === 0) continue
        if (stroke.space === 'slide' && !slideRect) continue
        if (stroke.space === 'slide' && slideRect) {
          annotationContext.save()
          annotationContext.beginPath()
          annotationContext.rect(slideRect.x, slideRect.y, slideRect.width, slideRect.height)
          annotationContext.clip()
        }
        annotationContext.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
        annotationContext.strokeStyle = stroke.color
        annotationContext.lineWidth = stroke.width * (stroke.space === 'slide' ? slideZoom : 1)
        annotationContext.lineCap = 'round'
        annotationContext.lineJoin = 'round'
        annotationContext.beginPath()
        const firstPoint = stroke.space === 'slide' && slideRect
          ? { x: slideRect.x + stroke.points[0].x * slideRect.width, y: slideRect.y + stroke.points[0].y * slideRect.height }
          : { x: stroke.points[0].x * STAGE_WIDTH, y: stroke.points[0].y * STAGE_HEIGHT }
        annotationContext.moveTo(firstPoint.x, firstPoint.y)
        for (const point of stroke.points.slice(1)) {
          const stagePoint = stroke.space === 'slide' && slideRect
            ? { x: slideRect.x + point.x * slideRect.width, y: slideRect.y + point.y * slideRect.height }
            : { x: point.x * STAGE_WIDTH, y: point.y * STAGE_HEIGHT }
          annotationContext.lineTo(stagePoint.x, stagePoint.y)
        }
        annotationContext.stroke()
        if (stroke.space === 'slide') annotationContext.restore()
      }
      annotationContext.globalCompositeOperation = 'source-over'
      context.drawImage(annotationCanvas, 0, 0)
      frameId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(frameId)
      if (annotationCanvasRef.current === annotationCanvas) annotationCanvasRef.current = null
    }
  }, [cameraOn, slideZoom, sourceMode])

  const currentSlide = slides[slideIndex] ?? null

  useEffect(() => {
    let cancelled = false
    let renderTask: { cancel: () => void } | null = null
    slideVisualRef.current = null
    setSlideVisualVersion((version) => version + 1)

    if (!currentSlide) {
      setSlidesLoading(false)
      return
    }
    if (currentSlide.kind === 'image') {
      slideVisualRef.current = currentSlide.visual
      if (!manualZoomRef.current) setSlideZoom(currentSlide.visual.naturalHeight > currentSlide.visual.naturalWidth ? 1.5 : 1)
      setSlideVisualVersion((version) => version + 1)
      setSlidesLoading(false)
      return
    }

    const pdfDocument = pdfDocumentsRef.current.get(currentSlide.documentId)
    if (!pdfDocument) {
      setSlidesLoading(false)
      setError(`Could not open page ${currentSlide.pageNumber} of this PDF. Please upload it again.`)
      return
    }

    setSlidesLoading(true)
    void (async () => {
      const page = await pdfDocument.getPage(currentSlide.pageNumber)
      const baseViewport = page.getViewport({ scale: 1 })
      if (!manualZoomRef.current) setSlideZoom(baseViewport.height > baseViewport.width ? 1.5 : 1)
      const scale = Math.min(STAGE_WIDTH / baseViewport.width, STAGE_HEIGHT / baseViewport.height) * 2
      const viewport = page.getViewport({ scale })
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = Math.max(1, Math.ceil(viewport.width))
      pageCanvas.height = Math.max(1, Math.ceil(viewport.height))
      const pageContext = pageCanvas.getContext('2d')
      if (!pageContext) throw new Error('Could not create a canvas for this PDF page.')
      pageContext.fillStyle = '#ffffff'
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      const task = page.render({ canvas: pageCanvas, canvasContext: pageContext, viewport })
      renderTask = task
      pdfRenderTaskRef.current = task
      await task.promise
      if (!cancelled) {
        slideVisualRef.current = pageCanvas
        setSlideVisualVersion((version) => version + 1)
      }
    })().catch((renderError: unknown) => {
      if (!cancelled) setError(renderError instanceof Error ? `Could not render this PDF page. ${renderError.message}` : 'Could not render this PDF page.')
    }).finally(() => {
      if (!cancelled) setSlidesLoading(false)
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
      if (pdfRenderTaskRef.current === renderTask) pdfRenderTaskRef.current = null
    }
  }, [currentSlide])

  useEffect(() => {
    slideScrollRef.current = { x: 0, y: 0 }
    slideScrollerRef.current?.scrollTo({ left: 0, top: 0 })
  }, [currentSlide])

  useEffect(() => {
    let cancelled = false
    const restoreLatestRecording = async () => {
      try {
        const recordings = await listSavedRecordings()
        if (cancelled) return
        setSavedRecordings(recordings)
        const latest = recordings[0]
        if (!latest) return
        const stored = await getSavedRecording(latest.id)
        if (cancelled || !stored) return
        setRecordedBlob(stored.blob)
        setRecordedFormat(stored.metadata.format)
        setActiveRecordingId(stored.metadata.id)
        setTitle(stored.metadata.title)
        titleRef.current = stored.metadata.title
        setElapsedSeconds(stored.metadata.durationSeconds)
        setVideoDuration(stored.metadata.durationSeconds)
        setTrimStart(0)
        setTrimEnd(stored.metadata.durationSeconds)
        setNotice('Restored your latest recording saved on this device.')
      } catch (storageError) {
        if (!cancelled) {
          setNotice(storageError instanceof Error
            ? `Could not open local recordings. ${storageError.message}`
            : 'Could not open local recordings in this browser.')
        }
      } finally {
        if (!cancelled) setLoadingSavedRecordings(false)
      }
    }
    void restoreLatestRecording()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!recordedBlob) {
      setVideoUrl('')
      return
    }
    const url = URL.createObjectURL(recordedBlob)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recordedBlob])

  useEffect(() => {
    if (screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current
      void screenVideoRef.current.play().catch(() => undefined)
    }
    if (cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current
      void cameraVideoRef.current.play().catch(() => undefined)
    }
  }, [screenReady, cameraOn])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    ffmpegRef.current?.terminate()
    pdfRenderTaskRef.current?.cancel()
    for (const pdfDocument of pdfDocumentsRef.current.values()) void pdfDocument.destroy()
    for (const url of imageUrlsRef.current) URL.revokeObjectURL(url)
    releaseMedia()
  }, [releaseMedia])

  const addSlideFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const selectedFiles = Array.from(files)
    setSlidesLoading(true)
    setError('')
    setNotice('Loading slides on this device…')

    const additions: SlideItem[] = []
    const skipped: string[] = []
    let pdfjs: PdfJsModule | null = null

    try {
      for (const file of selectedFiles) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        if (isPdf) {
          try {
            pdfjs ??= await import('pdfjs-dist') as unknown as PdfJsModule
            pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/5.5.207/pdf.worker.min.mjs'
            const documentId = crypto.randomUUID()
            const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
            pdfDocumentsRef.current.set(documentId, pdfDocument)
            for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
              additions.push({
                id: `${documentId}-${pageNumber}`,
                label: `${file.name} · page ${pageNumber}`,
                kind: 'pdf',
                documentId,
                pageNumber,
              })
            }
          } catch (fileError) {
            skipped.push(file.name)
            setError(fileError instanceof Error ? `Could not read ${file.name}: ${fileError.message}` : `Could not read ${file.name}.`)
          }
          continue
        }

        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file)
          try {
            const image = new Image()
            image.src = url
            await image.decode()
            imageUrlsRef.current.add(url)
            additions.push({
              id: crypto.randomUUID(),
              label: file.name,
              kind: 'image',
              visual: image,
              url,
            })
          } catch {
            URL.revokeObjectURL(url)
            skipped.push(file.name)
          }
          continue
        }

        skipped.push(file.name)
      }

      if (additions.length) {
        setSlides((current) => [...current, ...additions])
        setSlideIndex((current) => slides.length ? current : 0)
        if (sourceMode === 'screen') {
          const selectedSlide = slides[slideIndex]
          strokesRef.current = selectedSlide ? slideStrokesRef.current.get(selectedSlide.id) ?? [] : []
        }
        setSourceMode('slides')
        setNotice(`${additions.length} slide${additions.length === 1 ? '' : 's'} ready. Select a page and prepare the studio to record.`)
      }
      if (skipped.length) {
        const unsupported = skipped.some((name) => /\.(ppt|pptx)$/i.test(name))
        setError(unsupported
          ? `Skipped ${skipped.join(', ')}. Export PowerPoint files as PDF first, or upload slide images.`
          : `Could not load ${skipped.join(', ')}. Use a PDF or a supported image file.`)
      }
      if (!additions.length && !skipped.length) setNotice('No PDF or image slides were selected.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? `Could not load these slides. ${uploadError.message}` : 'Could not load these slides.')
    } finally {
      setSlidesLoading(false)
      if (slidesInputRef.current) slidesInputRef.current.value = ''
    }
  }

  const clearSlideDeck = () => {
    pdfRenderTaskRef.current?.cancel()
    for (const pdfDocument of pdfDocumentsRef.current.values()) void pdfDocument.destroy()
    pdfDocumentsRef.current.clear()
    for (const url of imageUrlsRef.current) URL.revokeObjectURL(url)
    imageUrlsRef.current.clear()
    slideStrokesRef.current.clear()
    strokesRef.current = []
    slideVisualRef.current = null
    setSlides([])
    setSlideIndex(0)
    setSlideZoom(1)
    slideScrollRef.current = { x: 0, y: 0 }
    slideScrollerRef.current?.scrollTo({ left: 0, top: 0 })
    manualZoomRef.current = false
    setSlideVisualVersion((version) => version + 1)
  }

  const selectSlide = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= slides.length) return
    if (currentSlide) slideStrokesRef.current.set(currentSlide.id, strokesRef.current)
    const nextSlide = slides[nextIndex]
    strokesRef.current = slideStrokesRef.current.get(nextSlide.id) ?? []
    setSlideIndex(nextIndex)
  }

  const chooseSlideSource = () => {
    if (currentSlide) strokesRef.current = slideStrokesRef.current.get(currentSlide.id) ?? []
    slideScrollRef.current = { x: 0, y: 0 }
    setSourceMode('slides')
  }

  const chooseScreenSource = () => {
    if (currentSlide) slideStrokesRef.current.set(currentSlide.id, strokesRef.current)
    strokesRef.current = []
    setSourceMode('screen')
  }

  const prepareStudio = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (sourceMode === 'slides' && !slides.length) {
        throw new Error('Upload a PDF or slide images before preparing the studio.')
      }
      if (!window.MediaRecorder) throw new Error('Recording is not supported in this browser. Try the latest Chrome or Edge.')

      let screen: MediaStream | null = null
      if (sourceMode === 'screen') {
        if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Screen sharing is not supported in this browser.')
        screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 30 } },
          audio: true,
        })
        screenStreamRef.current = screen
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screen
          await screenVideoRef.current.play()
        }
      }

      if (micOn) {
        try {
          microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
          setMicOn(false)
          setNotice('Microphone access was unavailable. You can still record the lesson and camera.')
        }
      }
      if (cameraOn) {
        try {
          cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } })
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = cameraStreamRef.current
            await cameraVideoRef.current.play().catch(() => undefined)
          }
        } catch {
          setCameraOn(false)
          setNotice('Camera access was unavailable. You can still record the lesson and microphone.')
        }
      }

      const audioContext = new AudioContext()
      const destination = audioContext.createMediaStreamDestination()
      audioContextRef.current = audioContext
      audioDestinationRef.current = destination
      await audioContext.resume()
      const audioSources = [screen, microphoneStreamRef.current].filter((stream): stream is MediaStream => Boolean(stream))
      for (const stream of audioSources) {
        if (stream.getAudioTracks().length) {
          const audioOnlyStream = new MediaStream(stream.getAudioTracks())
          audioContext.createMediaStreamSource(audioOnlyStream).connect(destination)
        }
      }

      screen?.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
        releaseMedia()
      }, { once: true })
      strokesRef.current = sourceMode === 'slides' && currentSlide
        ? slideStrokesRef.current.get(currentSlide.id) ?? []
        : []
      setScreenReady(true)
    } catch (captureError) {
      releaseMedia()
      setError(errorMessage(captureError))
    } finally {
      setBusy(false)
    }
  }

  const startRecording = () => {
    const canvas = canvasRef.current
    const audio = audioDestinationRef.current
    if (!canvas || !canvas.captureStream) {
      setError('Canvas recording is not supported in this browser. Try the latest Chrome or Edge.')
      return
    }
    try {
      const videoStream = canvas.captureStream(30)
      const tracks = [...videoStream.getVideoTracks(), ...(audio?.stream.getAudioTracks() ?? [])]
      const combinedStream = new MediaStream(tracks)
      const mimeTypes = [
        'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
      let recorder: MediaRecorder | null = null
      for (const mimeType of mimeTypes) {
        if (!MediaRecorder.isTypeSupported(mimeType)) continue
        try {
          recorder = new MediaRecorder(combinedStream, { mimeType })
          break
        } catch {
          // Some browsers report a MIME type as supported but reject this track combination.
        }
      }
      if (!recorder) throw new Error('This browser cannot record video in a supported format.')
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder?.mimeType || 'video/webm'
        const blob = new Blob(chunksRef.current, { type })
        const format = type.toLowerCase().includes('mp4') ? 'mp4' : 'webm'
        const startedAt = recordingStartedAtRef.current ?? Date.now()
        const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000))
        const metadata: SavedRecordingMetadata = {
          id: crypto.randomUUID(),
          title: titleRef.current.trim() || 'Untitled lesson',
          format,
          createdAt: Date.now(),
          durationSeconds,
        }
        recordingStartedAtRef.current = null
        setRecordedBlob(blob)
        setRecordedFormat(format)
        setActiveRecordingId(metadata.id)
        setTrimStart(0)
        setTrimEnd(0)
        setVideoDuration(0)
        setRecording(false)
        setSavingRecording(true)
        setNotice('Saving this recording on your device…')
        void persistRecording({ metadata, blob }).then(() => {
          setSavedRecordings((current) => [metadata, ...current.filter((item) => item.id !== metadata.id)].sort((a, b) => b.createdAt - a.createdAt))
          setNotice('Recording saved on this device. It will be available after you refresh.')
        }).catch((storageError: unknown) => {
          setActiveRecordingId(null)
          setError(storageError instanceof Error
            ? `The recording is available until you leave this page, but could not be saved locally. ${storageError.message}`
            : 'The recording is available until you leave this page, but could not be saved in this browser.')
        }).finally(() => setSavingRecording(false))
      }
      recorder.onerror = () => {
        setRecording(false)
        setError('The browser stopped recording unexpectedly. Please try again.')
      }
      recorderRef.current = recorder
      recorder.start(1000)
      recordingStartedAtRef.current = Date.now()
      setElapsedSeconds(0)
      setRecordedBlob(null)
      setActiveRecordingId(null)
      setRecordedFormat(null)
      setTrimStart(0)
      setTrimEnd(0)
      setVideoDuration(0)
      setRecording(true)
      setError('')
      setNotice('')
    } catch (recordError) {
      setError(errorMessage(recordError))
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const stopScreenShare = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    releaseMedia()
  }

  const toggleMicrophone = async () => {
    const next = !micOn
    if (next && screenReady && !microphoneStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        microphoneStreamRef.current = stream
        const audioContext = audioContextRef.current
        const destination = audioDestinationRef.current
        if (audioContext && destination) audioContext.createMediaStreamSource(stream).connect(destination)
      } catch {
        setError('Microphone permission was denied or no microphone is available.')
        return
      }
    }
    setMicOn(next)
    microphoneStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next })
  }

  const toggleCamera = async () => {
    const next = !cameraOn
    if (next && screenReady && !cameraStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } })
        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play().catch(() => undefined)
        }
      } catch {
        setError('Camera permission was denied or no camera is available.')
        return
      }
    }
    setCameraOn(next)
    cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next })
  }

  const canvasPoint = (event: PointerEventType<HTMLElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
  }

  const slidePoint = (event: PointerEventType<HTMLElement>, clampToPage = false): Point | null => {
    const visual = slideVisualRef.current
    if (!visual) return null
    const rect = getContainedVisualRect(visual, slideZoom, slideScrollRef.current)
    if (!rect) return null
    const viewportPoint = canvasPoint(event)
    const rawPoint = {
      x: (viewportPoint.x * STAGE_WIDTH - rect.x) / rect.width,
      y: (viewportPoint.y * STAGE_HEIGHT - rect.y) / rect.height,
    }
    if (!clampToPage && (rawPoint.x < 0 || rawPoint.x > 1 || rawPoint.y < 0 || rawPoint.y > 1)) return null
    return clampToPage
      ? { x: Math.max(0, Math.min(1, rawPoint.x)), y: Math.max(0, Math.min(1, rawPoint.y)) }
      : rawPoint
  }

  const beginSlideStroke = (event: PointerEventType<HTMLElement>) => {
    if (!activeTool || !screenReady) return
    const point = slidePoint(event)
    if (!point) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const width = activeTool === 'eraser' ? Math.max(28, penSize * 4) : penSize
    const stroke: Stroke = {
      color: penColor,
      width: width / slideZoom,
      tool: activeTool,
      space: 'slide',
      points: [point],
    }
    drawingStrokeRef.current = stroke
    strokesRef.current.push(stroke)
    if (currentSlide) slideStrokesRef.current.set(currentSlide.id, strokesRef.current)
  }

  const continueSlideStroke = (event: PointerEventType<HTMLElement>) => {
    if (!drawingStrokeRef.current) return
    const point = slidePoint(event, true)
    if (point) drawingStrokeRef.current.points.push(point)
  }

  const openSavedRecording = async (recording: SavedRecordingMetadata) => {
    setOpeningRecordingId(recording.id)
    setError('')
    try {
      const stored = await getSavedRecording(recording.id)
      if (!stored) throw new Error('The video file is missing from local storage.')
      setRecordedBlob(stored.blob)
      setRecordedFormat(stored.metadata.format)
      setActiveRecordingId(recording.id)
      setTitle(stored.metadata.title)
      titleRef.current = stored.metadata.title
      setElapsedSeconds(stored.metadata.durationSeconds)
      setVideoDuration(stored.metadata.durationSeconds)
      setTrimStart(0)
      setTrimEnd(stored.metadata.durationSeconds)
      setNotice(`Opened “${stored.metadata.title}” from this device.`)
    } catch (storageError) {
      setError(storageError instanceof Error ? storageError.message : 'Could not open this saved recording.')
    } finally {
      setOpeningRecordingId(null)
    }
  }

  const removeSavedRecording = async (id: string) => {
    setError('')
    try {
      await deleteSavedRecording(id)
      setSavedRecordings((current) => current.filter((recording) => recording.id !== id))
      if (activeRecordingId === id) setActiveRecordingId(null)
      setNotice('Saved recording deleted from this device.')
    } catch (storageError) {
      setError(storageError instanceof Error ? storageError.message : 'Could not delete this saved recording.')
    }
  }

  const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const formatPreciseDuration = (seconds: number) => `${formatDuration(Math.floor(seconds))}.${String(Math.floor((seconds % 1) * 10))}`
  const safeTitle = title.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'tutorlive-lesson'
  const editDuration = videoDuration || elapsedSeconds
  const isTrimmed = trimStart > 0.05 || (editDuration > 0 && trimEnd > 0 && trimEnd < editDuration - 0.05)
  const slideLayoutRect = slideVisualRef.current
    ? getContainedVisualRect(slideVisualRef.current, slideZoom, { x: 0, y: 0 })
    : null
  const slideContentWidth = Math.max(STAGE_WIDTH, slideLayoutRect?.width ?? STAGE_WIDTH)
  const slideContentHeight = Math.max(STAGE_HEIGHT, slideLayoutRect?.height ?? STAGE_HEIGHT)

  const downloadMp4 = async () => {
    if (!recordedBlob || !recordedFormat || exportingMp4 || trimEnd <= trimStart) return
    setError('')

    if (recordedFormat === 'mp4' && !isTrimmed) {
      downloadBlob(recordedBlob, `${safeTitle}.mp4`)
      setNotice('MP4 downloaded to this device.')
      return
    }

    setExportingMp4(true)
    setExportProgress(0)
    setNotice('Loading the MP4 encoder. On first use this downloads about 31 MB; conversion stays on this device.')

    let ffmpeg = ffmpegRef.current
    try {
      const [{ FFmpeg }, { fetchFile }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ])

      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        ffmpeg.on('progress', ({ progress }) => {
          setExportProgress(Math.max(0, Math.min(100, Math.round(progress * 100))))
        })
        try {
          await ffmpeg.load({
            coreURL: '/ffmpeg/0.12.10/ffmpeg-core.js',
            wasmURL: '/ffmpeg/0.12.10/ffmpeg-core.wasm',
          })
          ffmpegRef.current = ffmpeg
        } catch (loadError) {
          ffmpeg.terminate()
          throw loadError
        }
      }

      const inputName = `lesson-recording.${recordedFormat}`
      const outputName = 'lesson-recording.mp4'
      try {
        await ffmpeg.writeFile(inputName, await fetchFile(recordedBlob))
        const exitCode = await ffmpeg.exec([
          ...(isTrimmed && trimStart > 0 ? ['-ss', trimStart.toFixed(1)] : []),
          '-i', inputName,
          ...(isTrimmed ? ['-t', (trimEnd - trimStart).toFixed(1)] : []),
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outputName,
        ])
        if (exitCode !== 0) throw new Error('The MP4 encoder could not convert this recording.')

        const output = await ffmpeg.readFile(outputName)
        if (typeof output === 'string') throw new Error('The MP4 encoder returned an invalid video file.')
        const mp4Blob = new Blob([output.slice().buffer as ArrayBuffer], { type: 'video/mp4' })
        downloadBlob(mp4Blob, `${safeTitle}.mp4`)
        setNotice(isTrimmed
          ? 'Edited MP4 downloaded. Trimming and conversion were completed on this device; your recording was not uploaded.'
          : 'MP4 downloaded. The conversion was completed on this device; your recording was not uploaded.')
      } finally {
        await Promise.allSettled([
          ffmpeg.deleteFile(inputName),
          ffmpeg.deleteFile(outputName),
        ])
      }
    } catch (exportError) {
      setError(exportError instanceof Error
        ? `Could not export MP4. ${exportError.message}`
        : 'Could not export MP4. Please try again on a device with more available memory.')
    } finally {
      setExportingMp4(false)
      setExportProgress(0)
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Tutor tools</p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Recording Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Upload and zoom into PDF slides, annotate with custom colors, then record, preview, and trim the lesson video.</p>
        </div>
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-xs text-blue-100">
          Export MP4 on this device. The encoder loads only when you request an export.
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3 sm:p-4">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Lesson title</span>
              <input
                value={title}
                onChange={(event) => { setTitle(event.target.value); titleRef.current = event.target.value }}
                maxLength={100}
                aria-label="Lesson title"
                className="w-full border-0 bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500 focus:ring-0"
                placeholder="Name this lesson"
              />
            </label>
            {recording && (
              <div className="flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1.5 text-sm font-medium text-rose-300" aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> REC {formatDuration(elapsedSeconds)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
            <button type="button" onClick={chooseSlideSource} disabled={screenReady} aria-pressed={sourceMode === 'slides'} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-50 ${sourceMode === 'slides' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}>
              <FileText size={16} /> Slides
            </button>
            <button type="button" onClick={chooseScreenSource} disabled={screenReady} aria-pressed={sourceMode === 'screen'} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-50 ${sourceMode === 'screen' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}>
              <MonitorUp size={16} /> Screen share
            </button>
            {slidesLoading && <span className="ml-auto inline-flex items-center gap-2 text-xs text-slate-400"><LoaderCircle size={14} className="animate-spin" /> Loading slides…</span>}
          </div>

          <div className="bg-black p-2 sm:p-4">
            <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
              <canvas
                ref={canvasRef}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                aria-label="Recording preview. Use the pen tool to annotate the current slide or screen."
                className={`h-full w-full object-contain ${sourceMode === 'slides' ? 'pointer-events-none' : 'touch-none'} ${activeTool && screenReady ? 'cursor-crosshair' : 'cursor-default'}`}
                onPointerDown={(event) => {
                  if (sourceMode === 'screen' && activeTool && screenReady) {
                    event.currentTarget.setPointerCapture(event.pointerId)
                    const stroke: Stroke = {
                      color: penColor,
                      width: activeTool === 'eraser' ? Math.max(28, penSize * 4) : penSize,
                      tool: activeTool,
                      space: 'stage',
                      points: [canvasPoint(event)],
                    }
                    drawingStrokeRef.current = stroke
                    strokesRef.current.push(stroke)
                  }
                }}
                onPointerMove={(event) => {
                  if (drawingStrokeRef.current) {
                    drawingStrokeRef.current.points.push(canvasPoint(event))
                  }
                }}
                onPointerUp={() => { drawingStrokeRef.current = null }}
                onPointerCancel={() => { drawingStrokeRef.current = null }}
              />
              {sourceMode === 'slides' && (
                <div
                  ref={slideScrollerRef}
                  aria-label="Scrollable slide preview"
                  className={`absolute inset-0 z-10 overflow-auto ${activeTool && screenReady ? 'cursor-crosshair' : 'cursor-auto'}`}
                  style={{ touchAction: activeTool && screenReady ? 'none' : 'auto' }}
                  onScroll={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect()
                    slideScrollRef.current = {
                      x: event.currentTarget.scrollLeft * STAGE_WIDTH / bounds.width,
                      y: event.currentTarget.scrollTop * STAGE_HEIGHT / bounds.height,
                    }
                  }}
                  onPointerDown={beginSlideStroke}
                  onPointerMove={continueSlideStroke}
                  onPointerUp={() => { drawingStrokeRef.current = null }}
                  onPointerCancel={() => { drawingStrokeRef.current = null }}
                >
                  <div
                    aria-hidden="true"
                    data-slide-version={slideVisualVersion}
                    className="pointer-events-none"
                    style={{
                      width: `${(slideContentWidth / STAGE_WIDTH) * 100}%`,
                      height: `${(slideContentHeight / STAGE_HEIGHT) * 100}%`,
                    }}
                  />
                </div>
              )}
              <video ref={screenVideoRef} muted playsInline className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" />
              <video ref={cameraVideoRef} muted playsInline className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" />
              {screenReady && activeTool && <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-xs font-medium text-white">{activeTool === 'pen' ? 'Draw on the lesson preview' : 'Erase pen marks'}</span>}
            </div>
          </div>

          {sourceMode === 'slides' && slides.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2 sm:px-4">
                <button type="button" onClick={() => selectSlide(slideIndex - 1)} disabled={slideIndex <= 0 || slidesLoading} aria-label="Previous slide" className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-35"><ChevronLeft size={18} /></button>
                <span className="text-sm font-medium text-slate-200">Slide {slideIndex + 1} of {slides.length}</span>
                <button type="button" onClick={() => selectSlide(slideIndex + 1)} disabled={slideIndex >= slides.length - 1 || slidesLoading} aria-label="Next slide" className="grid h-9 w-9 place-items-center rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-35"><ChevronRight size={18} /></button>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{currentSlide?.label}</span>
                <button type="button" onClick={clearSlideDeck} disabled={screenReady || recording || slidesLoading} className="min-h-9 rounded-lg px-2 text-xs font-medium text-slate-400 hover:bg-white/5 disabled:opacity-40">Clear deck</button>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-3 py-2 sm:px-4">
                <label className="flex min-w-48 flex-1 items-center gap-3 text-xs text-slate-300">
                  <span>Slide zoom</span>
                  <input type="range" min="1" max="2.5" step="0.05" value={slideZoom} onChange={(event) => { manualZoomRef.current = true; setSlideZoom(Number(event.target.value)) }} className="min-w-16 flex-1 accent-blue-500" aria-label="Slide zoom" />
                  <span className="w-10 text-right tabular-nums">{Math.round(slideZoom * 100)}%</span>
                </label>
                <button type="button" onClick={() => { manualZoomRef.current = true; setSlideZoom(1); slideScrollRef.current = { x: 0, y: 0 }; slideScrollerRef.current?.scrollTo({ left: 0, top: 0 }) }} className="min-h-9 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-200 hover:bg-white/5">Fit page</button>
                {slideZoom > 1 && <span className="w-full text-xs text-slate-500 sm:w-auto">Scroll inside the preview to move through the enlarged page.</span>}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3 sm:p-4">
            {!screenReady ? (
              <button
                type="button"
                onClick={prepareStudio}
                disabled={busy || slidesLoading || (sourceMode === 'slides' && !slides.length)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
              >
                {busy ? <LoaderCircle size={17} className="animate-spin" /> : sourceMode === 'slides' ? <FileText size={17} /> : <MonitorUp size={17} />}
                {busy ? 'Preparing studio…' : sourceMode === 'slides' ? 'Prepare slide recording' : 'Share screen and prepare'}
              </button>
            ) : recording ? (
              <button type="button" onClick={stopRecording} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 sm:flex-none">
                <Square size={15} fill="currentColor" /> Stop recording
              </button>
            ) : (
              <>
                <button type="button" onClick={startRecording} disabled={exportingMp4 || slidesLoading || loadingSavedRecordings || savingRecording} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60 sm:flex-none">
                  <Circle size={16} fill="currentColor" /> {recordedBlob ? 'Record again' : 'Start recording'}
                </button>
                <button type="button" onClick={stopScreenShare} className="min-h-11 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5">End setup</button>
              </>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={toggleMicrophone} aria-label={micOn ? 'Mute microphone' : 'Enable microphone'} className={`grid h-10 w-10 place-items-center rounded-lg ${micOn ? 'text-slate-200 hover:bg-white/10' : 'bg-rose-500/15 text-rose-300'}`}>
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button type="button" onClick={toggleCamera} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'} className={`grid h-10 w-10 place-items-center rounded-lg ${cameraOn ? 'text-slate-200 hover:bg-white/10' : 'bg-rose-500/15 text-rose-300'}`}>
                {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button type="button" onClick={() => setActiveTool((tool) => tool === 'pen' ? null : 'pen')} disabled={!screenReady} aria-pressed={activeTool === 'pen'} aria-label="Pen tool" className={`grid h-10 w-10 place-items-center rounded-lg disabled:opacity-40 ${activeTool === 'pen' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-200 hover:bg-white/10'}`}>
                <Pen size={18} />
              </button>
              <button type="button" onClick={() => setActiveTool((tool) => tool === 'eraser' ? null : 'eraser')} disabled={!screenReady} aria-pressed={activeTool === 'eraser'} aria-label="Eraser tool" className={`grid h-10 w-10 place-items-center rounded-lg disabled:opacity-40 ${activeTool === 'eraser' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-200 hover:bg-white/10'}`}>
                <Eraser size={18} />
              </button>
              <button type="button" onClick={() => { strokesRef.current = []; if (sourceMode === 'slides' && currentSlide) slideStrokesRef.current.set(currentSlide.id, []) }} disabled={!screenReady} aria-label="Clear annotations" className="grid h-10 w-10 place-items-center rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-40">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h2 className="font-semibold text-white">Slides & recording setup</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Upload a PDF deck or multiple slide images. Files stay in this browser and are not uploaded to TutorLive.</p>
            <div className="mt-4 space-y-3">
              <input
                ref={slidesInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,image/*"
                multiple
                className="sr-only"
                aria-label="Upload PDF or slide images"
                onChange={(event) => { void addSlideFiles(event.currentTarget.files) }}
              />
              <button type="button" onClick={() => slidesInputRef.current?.click()} disabled={recording || slidesLoading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {slidesLoading ? <LoaderCircle size={17} className="animate-spin" /> : <Upload size={17} />}
                {slidesLoading ? 'Loading slides…' : slides.length ? 'Add PDF or images' : 'Upload PDF or slide images'}
              </button>
              <p className="text-xs leading-relaxed text-slate-500">PowerPoint files are not supported yet. Export them as PDF, then upload the PDF here.</p>
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/15 text-blue-300">{sourceMode === 'slides' ? <FileText size={18} /> : <MonitorUp size={18} />}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-100">{sourceMode === 'slides' ? 'Slide deck' : 'Screen source'}</p><p className="truncate text-xs text-slate-400">{sourceMode === 'slides' ? currentSlide?.label ?? 'No slides uploaded' : 'Choose a screen after preparing'}</p></div>
                {screenReady && <Check size={17} className="ml-auto text-emerald-400" />}
              </div>
              <button type="button" onClick={toggleMicrophone} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] p-3 text-left">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-300">{micOn ? <Mic size={18} /> : <MicOff size={18} />}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-100">Microphone</p><p className="text-xs text-slate-400">{micOn ? 'Include your voice' : 'Voice recording is off'}</p></div>
                <span className={`h-2 w-2 rounded-full ${micOn ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </button>
              <button type="button" onClick={toggleCamera} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] p-3 text-left">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/15 text-rose-300">{cameraOn ? <Camera size={18} /> : <VideoOff size={18} />}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-100">Camera</p><p className="text-xs text-slate-400">{cameraOn ? 'Show camera overlay' : 'Camera overlay is off'}</p></div>
                <span className={`h-2 w-2 rounded-full ${cameraOn ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </button>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-300">Pen color</p>
              <div className="flex flex-wrap items-center gap-2">
                {PEN_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => { setPenColor(color); setActiveTool('pen') }} aria-label={`Choose ${color} pen`} aria-pressed={penColor === color} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/25" style={{ backgroundColor: color }}>
                    {penColor === color && <Check size={15} className="text-slate-900" />}
                  </button>
                ))}
                <label className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-white/25 text-lg font-medium text-slate-900" style={{ backgroundColor: penColor }} title="Choose a custom pen color">
                  <span aria-hidden="true">+</span>
                  <input type="color" value={penColor} onChange={(event) => { setPenColor(event.target.value); setActiveTool('pen') }} aria-label="Choose custom pen color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </label>
              </div>
              <label className="mt-4 flex items-center gap-3 text-xs text-slate-300">
                <span>Pen size</span>
                <input type="range" min="2" max="14" step="1" value={penSize} onChange={(event) => setPenSize(Number(event.target.value))} className="flex-1 accent-blue-500" aria-label="Pen size" />
                <span className="w-6 text-right tabular-nums">{penSize}</span>
              </label>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">Choose Pen or Eraser in the toolbar. Erasing only affects your marks.</p>
            </div>
          </div>

        </aside>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-white">Your recording</h2>
            <p className="mt-1 text-xs text-slate-400">Preview the full video, choose a start and end point, then export the edited section as MP4.</p>
          </div>
          {recordedBlob && <p className="text-xs text-slate-400">{(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB · {recordedFormat === 'mp4' ? 'MP4' : 'ready for MP4 export'}</p>}
        </div>
        {recordedBlob && videoUrl ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => {
                const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : elapsedSeconds
                setVideoDuration(duration)
                setTrimStart(0)
                setTrimEnd(duration)
              }}
              className="aspect-video w-full rounded-xl bg-black"
              aria-label="Preview recorded lesson video"
            />
            <div className="space-y-4 rounded-xl bg-white/[0.04] p-4">
              <label className="block space-y-1.5 text-sm text-slate-300">
                <span className="flex justify-between gap-2"><span>Start at</span><span className="tabular-nums">{formatPreciseDuration(trimStart)}</span></span>
                <input type="range" min="0" max={Math.max(0, trimEnd - 0.1)} step="0.1" value={Math.min(trimStart, Math.max(0, trimEnd - 0.1))} onChange={(event) => setTrimStart(Number(event.target.value))} disabled={exportingMp4} className="w-full accent-blue-500 disabled:opacity-50" aria-label="Video trim start" />
              </label>
              <label className="block space-y-1.5 text-sm text-slate-300">
                <span className="flex justify-between gap-2"><span>End at</span><span className="tabular-nums">{formatPreciseDuration(trimEnd)}</span></span>
                <input type="range" min={Math.min(editDuration, trimStart + 0.1)} max={editDuration} step="0.1" value={Math.max(trimStart + 0.1, trimEnd)} onChange={(event) => setTrimEnd(Number(event.target.value))} disabled={exportingMp4} className="w-full accent-blue-500 disabled:opacity-50" aria-label="Video trim end" />
              </label>
              <button type="button" onClick={() => { setTrimStart(0); setTrimEnd(editDuration) }} disabled={exportingMp4 || !editDuration} className="min-h-9 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50">Reset trim</button>
              <p className="text-xs leading-relaxed text-slate-400">Selected clip: {formatPreciseDuration(Math.max(0, trimEnd - trimStart))}. Preview playback shows the full original recording.</p>
              <button type="button" onClick={downloadMp4} disabled={exportingMp4 || trimEnd <= trimStart} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60">
                {exportingMp4 ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
                {exportingMp4
                  ? exportProgress > 0 ? `Converting to MP4… ${exportProgress}%` : 'Preparing MP4…'
                  : recordedFormat === 'mp4' && !isTrimmed ? 'Download MP4' : 'Export edited MP4'}
              </button>
              {exportingMp4 && <p className="text-xs leading-relaxed text-slate-400" aria-live="polite">The video is being edited and converted in your browser. Large or long recordings need more device memory and may take a few minutes.</p>}
              <p className="text-xs leading-relaxed text-slate-500">MP4 editing and conversion happen on this device. The recording is not uploaded.</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-white/[0.04] p-4 text-sm leading-relaxed text-slate-400">{screenReady ? 'Start recording when your slides, microphone, and camera are ready. Your video preview and editing controls will appear here.' : 'After recording, preview the video and trim it before downloading the MP4.'}</p>
        )}

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Saved on this device</h3>
              <p className="mt-1 text-xs text-slate-500">Recordings are stored in this browser and remain available after refresh.</p>
            </div>
            {savingRecording && <span className="inline-flex items-center gap-2 text-xs text-blue-200"><LoaderCircle size={14} className="animate-spin" /> Saving recording…</span>}
          </div>
          {loadingSavedRecordings ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={15} className="animate-spin" /> Loading saved recordings…</p>
          ) : savedRecordings.length ? (
            <div className="mt-3 space-y-2">
              {savedRecordings.map((saved) => (
                <div key={saved.id} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${activeRecordingId === saved.id ? 'border-blue-400/30 bg-blue-500/10' : 'border-white/5 bg-white/[0.03]'}`}>
                  <button type="button" onClick={() => { void openSavedRecording(saved) }} disabled={recording || exportingMp4 || openingRecordingId !== null} className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left disabled:opacity-60">
                    <span className="block truncate text-sm font-medium text-slate-100">{saved.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{new Date(saved.createdAt).toLocaleString()} · {formatDuration(saved.durationSeconds)} · {saved.format.toUpperCase()}</span>
                  </button>
                  {openingRecordingId === saved.id && <LoaderCircle size={16} className="shrink-0 animate-spin text-blue-300" />}
                  <button type="button" onClick={() => { void removeSavedRecording(saved.id) }} disabled={recording || exportingMp4 || openingRecordingId !== null} aria-label={`Delete saved recording ${saved.title}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-white/[0.03] p-3 text-sm text-slate-400">Your completed recordings will appear here automatically.</p>
          )}
        </div>
      </section>

      {(error || notice) && (
        <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${error ? 'border-rose-400/20 bg-rose-400/10 text-rose-200' : 'border-blue-400/20 bg-blue-400/10 text-blue-100'}`}>
          {error ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <Check size={18} className="mt-0.5 shrink-0" />}
          <span>{error || notice}</span>
        </div>
      )}

      <p className="px-1 text-xs text-slate-500">Use Chrome or Edge over HTTPS. Your browser will ask for permission to share your screen and use your microphone or camera.</p>
    </div>
  )
}
