import { OrbitControls } from '@react-three/drei'
import { Environment } from './Environment'
import { BambooForest } from './BambooForest'
import { Fireflies } from './Fireflies'

export function Experience() {
  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom={true}
        maxDistance={40}
        minDistance={5}
        maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from going under ground
        target={[0, 2, 0]}
      />

      <Environment />
      <BambooForest count={400} />
      <Fireflies count={150} />
    </>
  )
}
