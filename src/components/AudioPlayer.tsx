import { useEffect, useRef } from 'react'

interface AudioPlayerProps {
  enabled: boolean
}

export function AudioPlayer({ enabled }: AudioPlayerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const isStartedRef = useRef(false)
  const enabledRef = useRef(enabled)

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
    const initAudio = () => {
      if (audioCtxRef.current) return

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      // Simple white noise generator
      const bufferSize = 2 * ctx.sampleRate
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      // Filter to make it sound like wind
      const filterNode = ctx.createBiquadFilter()
      filterNode.type = 'lowpass'
      filterNode.frequency.value = 400
      filterNode.Q.value = 0.5

      const gainNode = ctx.createGain()
      gainNode.gain.value = 0.05 // Very subtle

      whiteNoise.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      whiteNoise.start()
      isStartedRef.current = true

      // Modulate filter to simulate gusting wind
      const modulate = () => {
        if (!filterNode) return
        const time = ctx.currentTime
        filterNode.frequency.setValueAtTime(400 + Math.sin(time * 0.2) * 200 + Math.sin(time * 0.5) * 100, time)
        requestAnimationFrame(modulate)
      }
      modulate()

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
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  return null
}
