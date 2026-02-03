import { useEffect } from 'react'

export function AudioPlayer() {
  useEffect(() => {
    let audioCtx: AudioContext | null = null
    let filterNode: BiquadFilterNode | null = null

    const startAudio = () => {
      if (audioCtx) return

      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Simple white noise generator
      const bufferSize = 2 * audioCtx.sampleRate
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = audioCtx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      // Filter to make it sound like wind
      filterNode = audioCtx.createBiquadFilter()
      filterNode.type = 'lowpass'
      filterNode.frequency.value = 400
      filterNode.Q.value = 0.5

      const gainNode = audioCtx.createGain()
      gainNode.gain.value = 0.05 // Very subtle

      whiteNoise.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      whiteNoise.start()

      // Modulate filter to simulate gusting wind
      const modulate = () => {
        if (!filterNode) return
        const time = audioCtx!.currentTime
        filterNode.frequency.setValueAtTime(400 + Math.sin(time * 0.2) * 200 + Math.sin(time * 0.5) * 100, time)
        requestAnimationFrame(modulate)
      }
      modulate()
    }

    window.addEventListener('click', startAudio, { once: true })

    return () => {
      if (audioCtx) audioCtx.close()
      window.removeEventListener('click', startAudio)
    }
  }, [])

  return null
}
