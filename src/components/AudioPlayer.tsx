import { useEffect, useRef } from 'react'
import { Zone } from '../types'

interface AudioPlayerProps {
  enabled: boolean
  currentZone: Zone
  isIdle?: boolean
}

export function AudioPlayer({ enabled, currentZone, isIdle = false }: AudioPlayerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const isStartedRef = useRef(false)
  const enabledRef = useRef(enabled)

  // Audio Node Refs for modulation
  const windGainRef = useRef<GainNode | null>(null)
  const windFilterRef = useRef<BiquadFilterNode | null>(null)
  const streamGainRef = useRef<GainNode | null>(null)
  const birdsIntervalRef = useRef<number | null>(null)
  const isIdleRef = useRef(isIdle)

  useEffect(() => {
    isIdleRef.current = isIdle
  }, [isIdle])

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

  // Initialize Audio Graph
  useEffect(() => {
    const initAudio = () => {
      if (audioCtxRef.current) return

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      // 1. Wind (White Noise + Lowpass)
      const windBufferSize = 2 * ctx.sampleRate
      const windBuffer = ctx.createBuffer(1, windBufferSize, ctx.sampleRate)
      const windOutput = windBuffer.getChannelData(0)
      for (let i = 0; i < windBufferSize; i++) {
        windOutput[i] = Math.random() * 2 - 1
      }
      const windSource = ctx.createBufferSource()
      windSource.buffer = windBuffer
      windSource.loop = true

      const windFilter = ctx.createBiquadFilter()
      windFilter.type = 'lowpass'
      windFilter.frequency.value = 400
      windFilter.Q.value = 0.5
      windFilterRef.current = windFilter

      const windGain = ctx.createGain()
      windGain.gain.value = 0.05
      windGainRef.current = windGain

      windSource.connect(windFilter)
      windFilter.connect(windGain)
      windGain.connect(ctx.destination)
      windSource.start()

      // 2. Stream (Pink-ish Noise + Bandpass)
      const streamBufferSize = 2 * ctx.sampleRate
      const streamBuffer = ctx.createBuffer(1, streamBufferSize, ctx.sampleRate)
      const streamOutput = streamBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < streamBufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        streamOutput[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        streamOutput[i] *= 0.11 // (roughly) compensate for gain
        b6 = white * 0.115926
      }
      const streamSource = ctx.createBufferSource()
      streamSource.buffer = streamBuffer
      streamSource.loop = true

      const streamFilter = ctx.createBiquadFilter()
      streamFilter.type = 'bandpass'
      streamFilter.frequency.value = 800
      streamFilter.Q.value = 0.8

      const streamGain = ctx.createGain()
      streamGain.gain.value = 0 // Start muted
      streamGainRef.current = streamGain

      streamSource.connect(streamFilter)
      streamFilter.connect(streamGain)
      streamGain.connect(ctx.destination)
      streamSource.start()

      isStartedRef.current = true

      // Animate Wind
      const modulateWind = () => {
        if (!windFilterRef.current || !windGainRef.current || !audioCtxRef.current) return
        const time = audioCtxRef.current.currentTime
        // If idle, wind drops. If not, normal gusting.
        const currentIsIdle = isIdleRef.current
        const baseFreq = currentIsIdle ? 200 : 400
        const varFreq = currentIsIdle ? 50 : 200
        windFilterRef.current.frequency.setTargetAtTime(baseFreq + Math.sin(time * 0.2) * varFreq + Math.sin(time * 0.5) * (varFreq/2), time, 0.5)
        requestAnimationFrame(modulateWind)
      }
      modulateWind()

      // Sync initial state
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
      if (audioCtxRef.current) {
          audioCtxRef.current.close()
      }
      if (birdsIntervalRef.current) {
          clearInterval(birdsIntervalRef.current)
      }
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, []) // Empty deps, only run once

  // React to Zone and Idle changes
  useEffect(() => {
    if (!audioCtxRef.current || !isStartedRef.current) return
    const ctx = audioCtxRef.current

    // Stream Volume
    if (streamGainRef.current) {
       const targetStreamVol = currentZone === 'STREAM' ? (isIdle ? 0.08 : 0.05) : 0.0
       streamGainRef.current.gain.setTargetAtTime(targetStreamVol, ctx.currentTime, 2.0)
    }

    // Wind Volume (Drop when idle to reward stillness)
    if (windGainRef.current) {
        const targetWindVol = isIdle ? 0.02 : 0.05
        windGainRef.current.gain.setTargetAtTime(targetWindVol, ctx.currentTime, 3.0)
    }

    // Procedural Birds (More frequent in Clearing/Grove, especially when idle)
    if (birdsIntervalRef.current) {
        clearInterval(birdsIntervalRef.current)
    }

    const playBirdChirp = () => {
        if (!enabledRef.current || !audioCtxRef.current) return
        if (currentZone === 'DEEP_FOREST' && Math.random() > 0.2) return // Rare in deep forest

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Randomize pitch
        const basePitch = 3000 + Math.random() * 2000
        osc.frequency.setValueAtTime(basePitch, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(basePitch - 500, ctx.currentTime + 0.1)

        // Envelope
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(isIdle ? 0.08 : 0.04, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start()
        osc.stop(ctx.currentTime + 0.1)
    }

    // Calculate bird frequency
    let birdChance = 10000 // default rare
    if (currentZone === 'CLEARING') birdChance = 4000
    if (currentZone === 'GROVE') birdChance = 6000
    if (isIdle) birdChance *= 0.7 // More birds when still

    birdsIntervalRef.current = window.setInterval(() => {
        if (Math.random() > 0.5) playBirdChirp()
    }, birdChance)

  }, [currentZone, isIdle, enabled])

  return null
}
