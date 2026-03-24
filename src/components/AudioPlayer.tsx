import { useEffect, useRef } from 'react'
import { Zone } from '../types'

interface AudioPlayerProps {
  enabled: boolean
  currentZone: Zone
  isIdle?: boolean
}

type StemKey = 'wind' | 'birds' | 'insects' | 'stream'

type ZoneMix = Record<Zone, Record<StemKey, number>>

const ENABLE_RANDOM_ONESHOTS = true
const CROSSFADE_TIME = 2.4
const DETAIL_BLOOM = 0.018

const ZONE_MIX: ZoneMix = {
  CLEARING: {
    wind: 0.07,
    birds: 0.04,
    insects: 0.02,
    stream: 0.015,
  },
  GROVE: {
    wind: 0.06,
    birds: 0.032,
    insects: 0.03,
    stream: 0.02,
  },
  DEEP_FOREST: {
    wind: 0.05,
    birds: 0.018,
    insects: 0.045,
    stream: 0.0,
  },
  STREAM: {
    wind: 0.04,
    birds: 0.022,
    insects: 0.028,
    stream: 0.085,
  },
}

const STREAM_DISTANCE_BY_ZONE: Record<Zone, number> = {
  STREAM: 0.1,
  GROVE: 0.45,
  CLEARING: 0.62,
  DEEP_FOREST: 0.84,
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function createStemBuffer(ctx: AudioContext, stem: StemKey): AudioBuffer {
  const durationSec = 8
  const frameCount = Math.floor(ctx.sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const channel = buffer.getChannelData(0)

  let lpState = 0
  let hpState = 0

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / ctx.sampleRate
    const white = Math.random() * 2 - 1

    if (stem === 'wind') {
      lpState = lpState * 0.992 + white * 0.008
      const gust = 0.65 + 0.35 * Math.sin(t * 0.5)
      channel[i] = lpState * gust * 0.9
      continue
    }

    if (stem === 'stream') {
      lpState = lpState * 0.968 + white * 0.032
      const sparkle = Math.sin(t * 8.7) * 0.2 + Math.sin(t * 13.4) * 0.1
      channel[i] = (lpState * 0.75 + white * 0.2 + sparkle) * 0.65
      continue
    }

    if (stem === 'insects') {
      hpState = white - lpState * 0.97
      lpState = lpState * 0.97 + white * 0.03
      const trill = (Math.sin(t * 39) + Math.sin(t * 42.5)) * 0.08
      channel[i] = (hpState * 0.35 + trill) * 0.45
      continue
    }

    // distant birds bed: lightly tonal rustle, not prominent calls
    const tonal = Math.sin(t * 17 + Math.sin(t * 0.4) * 0.8) * 0.22
    const airy = white * 0.1 + Math.sin(t * 23.5) * 0.08
    channel[i] = (tonal + airy) * 0.28
  }

  return buffer
}

export function AudioPlayer({ enabled, currentZone, isIdle = false }: AudioPlayerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const isStartedRef = useRef(false)

  const enabledRef = useRef(enabled)
  const zoneRef = useRef(currentZone)
  const isIdleRef = useRef(isIdle)

  const windGainRef = useRef<GainNode | null>(null)
  const birdBedGainRef = useRef<GainNode | null>(null)
  const insectGainRef = useRef<GainNode | null>(null)
  const streamGainRef = useRef<GainNode | null>(null)
  const streamPannerRef = useRef<StereoPannerNode | null>(null)
  const windFilterRef = useRef<BiquadFilterNode | null>(null)

  const ambienceMasterRef = useRef<GainNode | null>(null)
  const oneShotBusRef = useRef<GainNode | null>(null)
  const oneShotTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    enabledRef.current = enabled

    if (audioCtxRef.current && isStartedRef.current) {
      if (enabled) {
        audioCtxRef.current.resume()
      } else {
        audioCtxRef.current.suspend()
      }
    }
  }, [enabled])

  useEffect(() => {
    zoneRef.current = currentZone
  }, [currentZone])

  useEffect(() => {
    isIdleRef.current = isIdle
  }, [isIdle])

  useEffect(() => {
    const initAudio = () => {
      if (audioCtxRef.current) return

      const AudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext
      if (!AudioContext) return

      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      // Build stems once and keep looping sources cheap.
      const stemBuffers: Record<StemKey, AudioBuffer> = {
        wind: createStemBuffer(ctx, 'wind'),
        birds: createStemBuffer(ctx, 'birds'),
        insects: createStemBuffer(ctx, 'insects'),
        stream: createStemBuffer(ctx, 'stream'),
      }

      const ambienceMaster = ctx.createGain()
      ambienceMaster.gain.value = 0.92
      ambienceMasterRef.current = ambienceMaster

      const oneShotBus = ctx.createGain()
      oneShotBus.gain.value = 0.28
      oneShotBusRef.current = oneShotBus

      ambienceMaster.connect(ctx.destination)
      oneShotBus.connect(ctx.destination)

      const windFilter = ctx.createBiquadFilter()
      windFilter.type = 'lowpass'
      windFilter.frequency.value = 550
      windFilter.Q.value = 0.7
      windFilterRef.current = windFilter

      const windGain = ctx.createGain()
      windGain.gain.value = 0
      windGainRef.current = windGain

      const birdsGain = ctx.createGain()
      birdsGain.gain.value = 0
      birdBedGainRef.current = birdsGain

      const insectsGain = ctx.createGain()
      insectsGain.gain.value = 0
      insectGainRef.current = insectsGain

      const streamGain = ctx.createGain()
      streamGain.gain.value = 0
      streamGainRef.current = streamGain

      const streamPanner = ctx.createStereoPanner()
      streamPanner.pan.value = 0
      streamPannerRef.current = streamPanner

      const windSource = ctx.createBufferSource()
      windSource.buffer = stemBuffers.wind
      windSource.loop = true
      windSource.connect(windFilter)
      windFilter.connect(windGain)
      windGain.connect(ambienceMaster)

      const birdsSource = ctx.createBufferSource()
      birdsSource.buffer = stemBuffers.birds
      birdsSource.loop = true
      birdsSource.playbackRate.value = 0.96
      birdsSource.connect(birdsGain)
      birdsGain.connect(ambienceMaster)

      const insectsSource = ctx.createBufferSource()
      insectsSource.buffer = stemBuffers.insects
      insectsSource.loop = true
      insectsSource.playbackRate.value = 1.02
      insectsSource.connect(insectsGain)
      insectsGain.connect(ambienceMaster)

      const streamSource = ctx.createBufferSource()
      streamSource.buffer = stemBuffers.stream
      streamSource.loop = true
      streamSource.playbackRate.value = 0.98
      streamSource.connect(streamPanner)
      streamPanner.connect(streamGain)
      streamGain.connect(ambienceMaster)

      windSource.start()
      birdsSource.start()
      insectsSource.start()
      streamSource.start()

      isStartedRef.current = true

      // Keep procedural movement subtle; stems carry the core ambience.
      const modulate = () => {
        const currentCtx = audioCtxRef.current
        if (!currentCtx) return

        const now = currentCtx.currentTime
        if (windFilterRef.current) {
          const base = isIdleRef.current ? 500 : 620
          const wobble = Math.sin(now * 0.23) * 55 + Math.sin(now * 0.41) * 25
          windFilterRef.current.frequency.setTargetAtTime(base + wobble, now, 0.8)
        }

        if (streamPannerRef.current && zoneRef.current === 'STREAM') {
          const drift = Math.sin(now * 0.11) * 0.18
          streamPannerRef.current.pan.setTargetAtTime(drift, now, 1.2)
        }

        requestAnimationFrame(modulate)
      }
      modulate()

      if (!enabledRef.current) {
        ctx.suspend()
      }
    }

    const handleInteraction = () => {
      if (!isStartedRef.current) {
        initAudio()
      }
    }

    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('touchstart', handleInteraction, { once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })

    return () => {
      if (oneShotTimeoutRef.current) {
        window.clearTimeout(oneShotTimeoutRef.current)
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  useEffect(() => {
    if (!audioCtxRef.current || !isStartedRef.current) return

    const ctx = audioCtxRef.current
    const zoneMix = ZONE_MIX[currentZone]
    const detailBloom = isIdle ? DETAIL_BLOOM : 0

    const fade = (node: GainNode | null, target: number, timeConstant = CROSSFADE_TIME) => {
      if (!node) return
      node.gain.setTargetAtTime(Math.max(0, target), ctx.currentTime, timeConstant)
    }

    fade(windGainRef.current, zoneMix.wind * (isIdle ? 0.9 : 1.0))
    fade(birdBedGainRef.current, zoneMix.birds + detailBloom)
    fade(insectGainRef.current, zoneMix.insects + detailBloom * 0.8)

    const streamDistance = STREAM_DISTANCE_BY_ZONE[currentZone]
    const attenuation = 1 / (1 + streamDistance * 3.3)
    const streamTarget = zoneMix.stream * attenuation
    fade(streamGainRef.current, streamTarget, 1.9)

    if (streamPannerRef.current) {
      const targetPan = currentZone === 'STREAM' ? clamp((0.5 - streamDistance) * 1.3, -0.65, 0.65) : 0
      streamPannerRef.current.pan.setTargetAtTime(targetPan, ctx.currentTime, 1.4)
    }

    if (oneShotTimeoutRef.current) {
      window.clearTimeout(oneShotTimeoutRef.current)
      oneShotTimeoutRef.current = null
    }

    if (!ENABLE_RANDOM_ONESHOTS) return

    const scheduleOneShot = () => {
      if (!audioCtxRef.current || !oneShotBusRef.current) return

      const activeCtx = audioCtxRef.current
      const zone = zoneRef.current
      const idle = isIdleRef.current

      const minMs = idle ? 5200 : 4200
      const maxMs = idle ? 11500 : 9200
      const jitterMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs

      oneShotTimeoutRef.current = window.setTimeout(() => {
        if (!enabledRef.current || !oneShotBusRef.current) {
          scheduleOneShot()
          return
        }

        const chance = Math.random()
        if (chance > 0.35) {
          const osc = activeCtx.createOscillator()
          const gain = activeCtx.createGain()
          const pan = activeCtx.createStereoPanner()

          const basePitch = zone === 'CLEARING' ? 3000 : zone === 'GROVE' ? 2700 : 2300
          const pitch = basePitch + Math.random() * 900
          const duration = 0.14 + Math.random() * 0.1
          const amp = idle ? 0.03 : 0.022

          osc.type = 'sine'
          osc.frequency.setValueAtTime(pitch, activeCtx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(pitch * 0.78, activeCtx.currentTime + duration)

          gain.gain.setValueAtTime(0.0001, activeCtx.currentTime)
          gain.gain.linearRampToValueAtTime(amp, activeCtx.currentTime + duration * 0.3)
          gain.gain.exponentialRampToValueAtTime(0.0001, activeCtx.currentTime + duration)

          pan.pan.value = (Math.random() - 0.5) * 0.9

          osc.connect(gain)
          gain.connect(pan)
          pan.connect(oneShotBusRef.current)

          osc.start()
          osc.stop(activeCtx.currentTime + duration)
        } else {
          const noise = activeCtx.createBufferSource()
          const burst = activeCtx.createBuffer(1, Math.floor(activeCtx.sampleRate * 0.16), activeCtx.sampleRate)
          const data = burst.getChannelData(0)
          for (let i = 0; i < data.length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
          }

          const hp = activeCtx.createBiquadFilter()
          hp.type = 'highpass'
          hp.frequency.value = 2200 + Math.random() * 1800

          const gain = activeCtx.createGain()
          gain.gain.setValueAtTime(idle ? 0.02 : 0.014, activeCtx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.0001, activeCtx.currentTime + 0.16)

          const pan = activeCtx.createStereoPanner()
          pan.pan.value = (Math.random() - 0.5) * 0.95

          noise.buffer = burst
          noise.connect(hp)
          hp.connect(gain)
          gain.connect(pan)
          pan.connect(oneShotBusRef.current)
          noise.start()
        }

        scheduleOneShot()
      }, jitterMs)
    }

    scheduleOneShot()

    return () => {
      if (oneShotTimeoutRef.current) {
        window.clearTimeout(oneShotTimeoutRef.current)
        oneShotTimeoutRef.current = null
      }
    }
  }, [currentZone, isIdle, enabled])

  return null
}
