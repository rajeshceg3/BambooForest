import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Experience } from './components/Experience'
import { Overlay } from './components/Overlay'
import { UI } from './components/UI'
import { AudioPlayer } from './components/AudioPlayer'
import { Cursor } from './components/Cursor'
import { TourProvider } from './components/TourContext'
import { TourOverlay } from './components/TourOverlay'
import { Zone } from './types'
import { useIdle } from './components/useIdle'
import './App.css'

function App() {
  const [currentZone, setCurrentZone] = useState<Zone>('GROVE')
  const [audioEnabled, setAudioEnabled] = useState(false)
  const isIdle = useIdle(5000)

  return (
    <TourProvider>
      <div className="relative w-full h-screen overflow-hidden bg-black">
        <div className="absolute inset-0 pointer-events-none z-[200] bg-grain opacity-[0.05] mix-blend-overlay"></div>
        <Canvas
          shadows
          camera={{ position: [0, 5, 25], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, toneMappingExposure: 1.2 }}
        >
          {/* We pass onZoneChange to Experience so the TourController can update the environment */}
          <Experience currentZone={currentZone} onZoneChange={setCurrentZone} />
        </Canvas>
        <UI audioEnabled={audioEnabled} onToggleAudio={() => setAudioEnabled(!audioEnabled)} isIdle={isIdle} />
        <Overlay currentZone={currentZone} onZoneChange={setCurrentZone} isIdle={isIdle} />
        <TourOverlay isIdle={isIdle} />
        <AudioPlayer enabled={audioEnabled} />
        <Cursor isIdle={isIdle} />
      </div>
    </TourProvider>
  )
}

export default App
