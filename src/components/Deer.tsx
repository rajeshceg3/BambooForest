import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

export function Deer(props: any) {
  const groupRef = useRef<THREE.Group>(null)

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#8b5a2b", // Russet Brown
      roughness: 0.8,
      metalness: 0.0,
    })

    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = `
            varying vec3 vPos;
            ${shader.vertexShader}
        `
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vPos = position;
            `
        )

        shader.fragmentShader = `
            varying vec3 vPos;

            // Simple hash noise
            float hash(vec3 p) {
                p  = fract( p*0.3183099 + .1 );
                p *= 17.0;
                return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
            }

            ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            // High frequency noise for fur
            float furNoise = hash(vPos * 120.0); // Finer grain

            // Mix base color with slightly darker/lighter variation
            float mixVal = 0.85 + 0.3 * furNoise;
            diffuseColor.rgb *= mixVal;

            // Fresnel Rim Light (Velvet Effect)
            vec3 viewDir = normalize(vViewPosition);
            vec3 viewNormal = normalize(vNormal);

            float fresnel = dot(viewDir, viewNormal);
            fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
            fresnel = pow(fresnel, 3.0);

            // Add soft warm rim light
            vec3 rimColor = vec3(1.0, 0.95, 0.85);

            // Soften the addition
            diffuseColor.rgb = mix(diffuseColor.rgb, rimColor, fresnel * 0.5);
            `
        )
    }
    return mat
  }, [])

  const darkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#2a1a10",
      roughness: 0.9,
    })
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
        const t = state.clock.getElapsedTime()

        // Move the entire deer forward slowly if desired, or just idle walk in place?
        // For this scene, the deer might be "grazing" or just standing.
        // But the task is "walking gait". If it walks in place, it looks weird.
        // I will make it walk a small circle or path if possible, but let's stick to local animation first.
        // The previous code had `groupRef.current.position.x += ...`.

        // Gentle forward drift
        groupRef.current.position.x += Math.sin(t * 0.2) * 0.002
        groupRef.current.position.z += Math.cos(t * 0.15) * 0.002
        groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.2

        // Breathing
        const body = groupRef.current.getObjectByName('ribcage')
        if (body) {
            const breath = 1 + Math.sin(t * 1.5) * 0.01
            body.scale.set(1, breath, 1)
        }

        // Head movement (scanning)
        const neck = groupRef.current.getObjectByName('neckGroup')
        if (neck) {
            neck.rotation.y = Math.sin(t * 0.3) * 0.3
            neck.rotation.x = -0.2 + Math.sin(t * 0.5) * 0.05
        }

        // Leg Animation (Idle sway/step)
        // FL and BR move together, FR and BL move together
        const speed = 3.0
        const amp = 0.15

        const legFL = groupRef.current.getObjectByName('leg_FL')
        const legFR = groupRef.current.getObjectByName('leg_FR')
        const legBL = groupRef.current.getObjectByName('leg_BL')
        const legBR = groupRef.current.getObjectByName('leg_BR')

        if (legFL && legFR && legBL && legBR) {
            legFL.rotation.x = Math.sin(t * speed) * amp
            legBR.rotation.x = Math.sin(t * speed) * amp

            legFR.rotation.x = Math.sin(t * speed + Math.PI) * amp
            legBL.rotation.x = Math.sin(t * speed + Math.PI) * amp
        }
    }
  })

  // Geometry Constants
  // Body is roughly 1.0 long, 0.4 wide/high
  // Legs are roughly 0.8 long

  return (
    <group ref={groupRef} {...props}>
      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={5} blur={2.5} far={4} color="#0a0a0a" />

      {/* Main Body Group - offset up so (0,0,0) is ground */}
      <group position={[0, 0.85, 0]}>

        {/* Torso/Ribcage */}
        <mesh name="ribcage" position={[0, 0, 0.15]} castShadow>
             <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
             <primitive object={material} attach="material" />
             <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                {/* Rotate capsule to be horizontal? No, standard capsule is vertical. */}
                {/* Wait, standard capsule is vertical Y-axis. */}
                {/* We want horizontal body. */}
             </mesh>
        </mesh>

        {/* Correcting orientation: A vertical capsule rotated 90deg on X becomes Z-aligned? */}
        {/* If I rotate X 90, Y becomes Z. Yes. */}
        <group rotation={[Math.PI / 2, 0, 0]}>
            {/* Chest */}
            <mesh position={[0, 0.2, 0]} castShadow>
                <capsuleGeometry args={[0.23, 0.4, 8, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Hips/Rear */}
            <mesh position={[0, -0.25, 0]} castShadow>
                 <capsuleGeometry args={[0.21, 0.4, 8, 16]} />
                 <primitive object={material} attach="material" />
            </mesh>
            {/* Belly blend */}
            <mesh position={[0, 0, -0.05]} castShadow>
                 <cylinderGeometry args={[0.22, 0.21, 0.6, 16]} />
                 <primitive object={material} attach="material" />
            </mesh>
        </group>


        {/* Neck Group */}
        <group name="neckGroup" position={[0, 0.35, 0.45]} rotation={[-0.2, 0, 0]}>
            {/* Neck base */}
            <mesh position={[0, 0.25, 0]} castShadow>
                <coneGeometry args={[0.12, 0.6, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Head */}
            <group position={[0, 0.55, 0.1]} rotation={[0.2, 0, 0]}>
                {/* Cranium */}
                <mesh position={[0, 0, 0]} castShadow>
                    <sphereGeometry args={[0.11, 16, 16]} />
                    <primitive object={material} attach="material" />
                </mesh>
                {/* Snout */}
                <mesh position={[0, -0.05, 0.12]} rotation={[0.2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.07, 0.09, 0.25, 16]} />
                    <primitive object={material} attach="material" />
                </mesh>
                {/* Nose Tip */}
                <mesh position={[0, -0.02, 0.25]} castShadow>
                     <sphereGeometry args={[0.04, 8, 8]} />
                     <primitive object={darkMaterial} attach="material" />
                </mesh>
                {/* Ears */}
                <mesh position={[0.08, 0.12, -0.05]} rotation={[0, 0, 0.5]} castShadow>
                    <coneGeometry args={[0.04, 0.25, 16]} />
                    <primitive object={material} attach="material" />
                </mesh>
                <mesh position={[-0.08, 0.12, -0.05]} rotation={[0, 0, -0.5]} castShadow>
                    <coneGeometry args={[0.04, 0.25, 16]} />
                    <primitive object={material} attach="material" />
                </mesh>
            </group>
        </group>

        {/* Tail */}
        <mesh position={[0, 0.2, -0.5]} rotation={[-0.5, 0, 0]} castShadow>
            <coneGeometry args={[0.05, 0.2, 8]} />
            <primitive object={material} attach="material" />
        </mesh>

        {/* Legs */}
        {/* Front Left */}
        <group name="leg_FL" position={[0.15, 0.1, 0.35]}>
            {/* Thigh/Shoulder */}
            <mesh position={[0, -0.15, 0]} rotation={[0, 0, 0]} castShadow>
                <coneGeometry args={[0.08, 0.35, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Knee Joint */}
            <mesh position={[0, -0.35, 0]} castShadow>
                <sphereGeometry args={[0.055, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Shin */}
            <mesh position={[0, -0.55, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.03, 0.4, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Hoof */}
            <mesh position={[0, -0.75, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

        {/* Front Right */}
        <group name="leg_FR" position={[-0.15, 0.1, 0.35]}>
             <mesh position={[0, -0.15, 0]} castShadow>
                <coneGeometry args={[0.08, 0.35, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.35, 0]} castShadow>
                <sphereGeometry args={[0.055, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.55, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.03, 0.4, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.75, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

        {/* Back Left */}
        <group name="leg_BL" position={[0.15, 0.05, -0.35]}>
             {/* Thigh (Haunch) - thicker */}
             <mesh position={[0, -0.15, 0]} rotation={[0.2, 0, 0]} castShadow>
                <coneGeometry args={[0.1, 0.4, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
             {/* Hock Joint */}
            <mesh position={[0, -0.35, 0.05]} castShadow>
                <sphereGeometry args={[0.06, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Shin (backward angle slightly) */}
            <mesh position={[0, -0.55, 0]} rotation={[-0.1, 0, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.035, 0.45, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
             <mesh position={[0, -0.78, -0.02]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

        {/* Back Right */}
        <group name="leg_BR" position={[-0.15, 0.05, -0.35]}>
             <mesh position={[0, -0.15, 0]} rotation={[0.2, 0, 0]} castShadow>
                <coneGeometry args={[0.1, 0.4, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.35, 0.05]} castShadow>
                <sphereGeometry args={[0.06, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.55, 0]} rotation={[-0.1, 0, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.035, 0.45, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
             <mesh position={[0, -0.78, -0.02]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

      </group>
    </group>
  )
}
