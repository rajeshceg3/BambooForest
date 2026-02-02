import { Canvas } from '@react-three/fiber'
import { Experience } from './components/Experience'
import './App.css'

function App() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 20], fov: 45 }}
      dpr={[1, 2]} // Optimization for mobile/high-dpi
      gl={{ antialias: true, toneMappingExposure: 1.2 }}
    >
      <Experience />
    </Canvas>
  )
}

export default App
