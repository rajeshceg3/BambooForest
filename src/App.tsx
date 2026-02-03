import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Experience } from './components/Experience'
import { Overlay } from './components/Overlay'
import { AudioPlayer } from './components/AudioPlayer'
import { Zone } from './types'
import './App.css'

function App() {
  const [currentZone, setCurrentZone] = useState<Zone>('GROVE')

  return (
    <div className="w-full h-screen bg-[#dcdcdc] overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 5, 25], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
      >
        <Experience currentZone={currentZone} />
      </Canvas>
      <Overlay currentZone={currentZone} onZoneChange={setCurrentZone} />
      <AudioPlayer />
    </div>
  )
}

export default App
