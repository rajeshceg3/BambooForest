import { useState, useEffect } from 'react'
import { DIAG } from './diag'
import { Canvas, type RootState } from '@react-three/fiber'
import { Experience } from './components/Experience'
import { Overlay } from './components/Overlay'
import { UI } from './components/UI'
import { AudioPlayer } from './components/AudioPlayer'
import { Cursor } from './components/Cursor'
import { TourProvider } from './components/TourContext'
import { TourOverlay } from './components/TourOverlay'
import { Zone } from './types'
import { useIdle } from './components/useIdle'
import { QualityProvider, useQuality } from './components/QualityContext'
import './App.css'

// Set entry once, not through Canvas.configure on every UI render.
const initializeCamera = ({ camera }: RootState) => {
  // Explicit lens: prior debugging silently inherited R3F's 75-degree default.
  // Controlled 45/75 entry comparison: 45 lets near trunks dominate the phone;
  // 75 gives more surrounding grove context. Full tour/lens acceptance remains
  // separate from this composition choice, never a performance justification.
  if ('fov' in camera) { (camera as import('three').PerspectiveCamera).fov = 75; camera.updateProjectionMatrix() }
  camera.position.set(18, 2, -10)
  camera.lookAt(18, 2, -20)
}

function App() {
  return (
    <QualityProvider>
      <AppScene />
    </QualityProvider>
  )
}

function TierBodySync() {
  const { tier } = useQuality()
  useEffect(() => {
    document.body.dataset.tier = tier
  }, [tier])
  return null
}

function AppScene() {
  const [currentZone, setCurrentZone] = useState<Zone>('GROVE')
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const isIdle = useIdle(5000)
  const { dprRange } = useQuality()

  return (
    <TourProvider>
      <div className="relative w-full h-screen overflow-hidden bg-black">
        <div className="absolute inset-0 pointer-events-none z-[200] bg-grain opacity-[0.05] mix-blend-overlay"></div>
        <TierBodySync />
      <Canvas
          shadows={!DIAG.noShadows}
          onCreated={initializeCamera}
          dpr={dprRange}
          gl={{ antialias: !DIAG.noAntialias, toneMappingExposure: 1.2 }}
        >
          {/* We pass onZoneChange to Experience so the TourController can update the environment */}
          <Experience currentZone={currentZone} onZoneChange={setCurrentZone} isIdle={isIdle} />
        </Canvas>
        <UI audioEnabled={audioEnabled} onToggleAudio={() => setAudioEnabled(!audioEnabled)} isIdle={isIdle} zenMode={zenMode} onToggleZenMode={() => setZenMode(!zenMode)} />
        <Overlay currentZone={currentZone} onZoneChange={setCurrentZone} isIdle={isIdle} zenMode={zenMode} />
        <TourOverlay isIdle={isIdle} zenMode={zenMode} />
        <AudioPlayer enabled={audioEnabled} currentZone={currentZone} isIdle={isIdle} />
        <Cursor isIdle={isIdle} />
      </div>
    </TourProvider>
  )
}

export default App
