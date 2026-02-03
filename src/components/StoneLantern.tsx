export function StoneLantern(props: any) {
  return (
    <group {...props}>
      {/* Base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.5, 0.8]} />
        <meshStandardMaterial color="#888888" roughness={0.9} />
      </mesh>
      {/* Pillar */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
        <meshStandardMaterial color="#888888" roughness={0.9} />
      </mesh>
      {/* Platform */}
      <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial color="#888888" roughness={0.9} />
      </mesh>
      {/* Light box */}
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.8, 0.7]} />
        <meshStandardMaterial color="#999999" roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 1, 0.4, 4]} />
        <meshStandardMaterial color="#777777" roughness={0.9} />
      </mesh>

      {/* The light itself */}
      <pointLight position={[0, 2.6, 0]} intensity={0.5} color="#ffaa44" distance={5} />
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.5]} />
        <meshBasicMaterial color="#ffaa44" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
