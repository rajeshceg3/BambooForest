import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'

export type QualityTier = 'ULTRA_LOW' | 'LOW' | 'MEDIUM' | 'HIGH'

interface QualityContextValue {
  tier: QualityTier
  dprRange: [number, number]
  reportFrameTime: (frameTimeMs: number) => void
}

const QualityContext = createContext<QualityContextValue | null>(null)

const tierRank: Record<QualityTier, number> = {
  ULTRA_LOW: -1,
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
}

// Weak GPUs make the LOW tier's first interaction stall the main thread for
// tens of seconds (measured on an Intel UHD 620: ~30s per drag before the
// runtime tripwire could react). Floor those sessions at ULTRA_LOW from boot
// instead of discovering it mid-drag. Two evidence-based signals:
//  1. Software rasterizers (SwiftShader, llvmpipe, Basic Render) fill-rate
//     every fragment on the CPU.
//  2. Pre-2019 integrated Intel (UHD/HD Graphics 3xx-6xx): measured stalls on
//     UHD 620 in cloud-browser testing; these parts lack the fill rate for
//     even the LOW instance counts.
function detectWeakRenderer(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return true
    return /intel[^)]*\b(uhd|hd)\s+graphics\s+[3-6]\d\d\b/i.test(renderer)
  } catch {
    return false
  }
}

const IS_WEAK_RENDERER = detectWeakRenderer()

function clampTierFromViewport(): QualityTier {
  if (typeof window === 'undefined') return 'MEDIUM'

  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  const renderPixels = width * height * dpr * dpr

  // Conservative defaults for mobile/high-DPR devices.
  if (IS_WEAK_RENDERER) return 'ULTRA_LOW'
  if (renderPixels > 5_200_000 || dpr >= 2.75 || width < 900) return 'LOW'
  if (renderPixels > 3_000_000 || dpr >= 2.1 || width < 1280) return 'MEDIUM'
  return 'HIGH'
}

function dprRangeForTier(tier: QualityTier): [number, number] {
  if (tier === 'ULTRA_LOW') return [0.6, 0.8]
  if (tier === 'LOW') return [0.75, 1.1]
  if (tier === 'MEDIUM') return [0.9, 1.5]
  return [1, 2]
}

export function QualityProvider({ children }: { children: ReactNode }) {
  const [viewportTier, setViewportTier] = useState<QualityTier>(clampTierFromViewport)
  // Boot conservative: always start the runtime tier at LOW and let measured
  // frame times upgrade it. Booting at the viewport-implied tier builds the
  // full HIGH scene before the sampler can react, which kills weak GPUs.
  const [runtimeTier, setRuntimeTier] = useState<QualityTier>(IS_WEAK_RENDERER ? 'ULTRA_LOW' : 'LOW')

  const frameWindowRef = useRef<number[]>([])
  const cooldownRef = useRef(0)
  const consecutiveSlowRef = useRef(0)
  // Once the sampler trips to ULTRA_LOW, stay there: letting averages climb
  // back up re-builds the heavy scene on a GPU that already choked once.
  const ultraLowLatchedRef = useRef(IS_WEAK_RENDERER)

  useEffect(() => {
    const onResize = () => {
      setViewportTier(clampTierFromViewport())
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const reportFrameTime = useCallback((frameTimeMs: number) => {
    // Fast path: a single catastrophic frame (>1s) or three consecutive slow
    // frames (>200ms) mean the GPU is drowning - drop to ULTRA_LOW immediately
    // instead of waiting for the averaged window to notice.
    if (frameTimeMs > 1000) {
      ultraLowLatchedRef.current = true
    }
    consecutiveSlowRef.current = frameTimeMs > 200 ? consecutiveSlowRef.current + 1 : 0
    if (consecutiveSlowRef.current >= 3) {
      ultraLowLatchedRef.current = true
    }
    if (ultraLowLatchedRef.current) {
      setRuntimeTier((prev) => (prev === 'ULTRA_LOW' ? prev : 'ULTRA_LOW'))
      frameWindowRef.current = []
      return
    }

    const frameWindow = frameWindowRef.current
    frameWindow.push(frameTimeMs)
    if (frameWindow.length > 45) frameWindow.shift()

    cooldownRef.current += 1
    if (frameWindow.length < 20 || cooldownRef.current < 20) return
    cooldownRef.current = 0

    const avgFrameTime = frameWindow.reduce((sum, value) => sum + value, 0) / frameWindow.length
    // Hysteresis to avoid flickering between tiers.
    const nextRuntimeTier: QualityTier =
      avgFrameTime > 40
        ? 'ULTRA_LOW'
        : avgFrameTime > 24
          ? 'LOW'
          : avgFrameTime > 18
            ? 'MEDIUM'
            : avgFrameTime < 14
              ? 'HIGH'
              : runtimeTier

    if (nextRuntimeTier === 'ULTRA_LOW') {
      ultraLowLatchedRef.current = true
    }
    if (nextRuntimeTier !== runtimeTier) {
      setRuntimeTier(nextRuntimeTier)
    }
  }, [runtimeTier])

  const tier: QualityTier = useMemo(() => {
    return tierRank[viewportTier] <= tierRank[runtimeTier] ? viewportTier : runtimeTier
  }, [runtimeTier, viewportTier])

  const value = useMemo<QualityContextValue>(() => ({
    tier,
    dprRange: dprRangeForTier(tier),
    reportFrameTime,
  }), [reportFrameTime, tier])

  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>
}

export function QualityFrameSampler() {
  const { reportFrameTime } = useQuality()

  useFrame((_, delta) => {
    reportFrameTime(delta * 1000)
  })

  return null
}

export function useQuality() {
  const context = useContext(QualityContext)
  if (!context) {
    throw new Error('useQuality must be used within a QualityProvider')
  }
  return context
}

