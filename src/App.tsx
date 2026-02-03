import { Canvas } from '@react-three/fiber'
import { Experience } from './components/Experience'
import { UI } from './components/UI'
import './App.css'

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 5, 20], fov: 45 }}
        dpr={[1, 2]} // Optimization for mobile/high-dpi
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
      >
        <Experience />
      </Canvas>
      <UI />
    </div>
  )
}

export default App
