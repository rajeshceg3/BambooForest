import { Canvas } from '@react-three/fiber'
import { OrbitControls, Instances, Instance } from '@react-three/drei'
import './App.css'

// Generate positions for 100 bamboo stalks
const bambooData = Array.from({ length: 100 }, () => ({
  position: [
    (Math.random() - 0.5) * 80, // spread them out on a larger area
    2.5, // position the base of the 5-unit tall cylinder on the floor
    (Math.random() - 0.5) * 80
  ],
  rotation: [0, Math.random() * Math.PI, 0],
  scale: 1 + Math.random() * 0.4 // add some variation
}));

function App() {
  return (
    <Canvas camera={{ position: [0, 10, 30] }} shadows>
      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        position={[10, 20, 5]}
        intensity={1.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <OrbitControls />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#556B2F" />
      </mesh>

      {/* Bamboo Forest */}
      <Instances castShadow>
        <cylinderGeometry args={[0.15, 0.2, 5, 8]} />
        <meshStandardMaterial color="#6B8E23" /> {/* Olive Drab */}
        {bambooData.map((props, i) => (
          <Instance key={i} {...props} />
        ))}
      </Instances>
    </Canvas>
  )
}

export default App
