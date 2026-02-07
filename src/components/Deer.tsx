import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

export function Deer(props: any) {
  const groupRef = useRef<THREE.Group>(null)

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#8b5a2b", // Russet Brown
      roughness: 0.8, // Fur is rougher
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
            float furNoise = hash(vPos * 80.0); // Scale up for fine grain

            // Mix base color with slightly darker/lighter variation
            float mixVal = 0.8 + 0.4 * furNoise;
            diffuseColor.rgb *= mixVal;

            // Fresnel Rim Light (Velvet Effect)
            // vViewPosition is calculated in vertex shader of MeshStandardMaterial
            vec3 viewDir = normalize(vViewPosition);
            // vNormal is calculated in normal_fragment_begin or similar
            // But we can use 'normal' which is available after normal_fragment_maps

            float fresnel = dot(viewDir, normal);
            fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
            fresnel = pow(fresnel, 2.5); // Tune power for width of rim

            // Add soft warm rim light
            vec3 rimColor = vec3(1.0, 0.95, 0.8);

            // Soften the addition
            diffuseColor.rgb = mix(diffuseColor.rgb, rimColor, fresnel * 0.4);
            `
        )
    }
    return mat
  }, [])

  // Darker nose/hooves
  const darkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#3e2723",
      roughness: 0.9,
    })
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
        const t = state.clock.getElapsedTime()

        // Very slow drift
        groupRef.current.position.x += Math.sin(t * 0.1) * 0.005

        // Breathing animation (scale body slightly)
        const body = groupRef.current.getObjectByName('body')
        if (body) {
            const breath = 1 + Math.sin(t * 1.5) * 0.005
            body.scale.set(1, breath, 1)
        }

        // Head look around
        const headGroup = groupRef.current.getObjectByName('headGroup')
        if (headGroup) {
            headGroup.rotation.y = Math.sin(t * 0.5) * 0.2
            headGroup.rotation.x = Math.sin(t * 0.3) * 0.1
        }
    }
  })

  return (
    <group ref={groupRef} {...props}>
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={5} blur={2.5} far={4} />

      {/* Body - Horizontal Capsule */}
      <mesh name="body" position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.7, 8, 32]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Head Group for animation */}
      <group name="headGroup" position={[0, 1.3, 0.5]}>
          {/* Neck */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 3, 0, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.6, 8, 32]} />
            <primitive object={material} attach="material" />
          </mesh>

          {/* Head */}
          <mesh position={[0, 0.45, 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
             <capsuleGeometry args={[0.14, 0.25, 8, 32]} />
             <primitive object={material} attach="material" />
          </mesh>

          {/* Ears */}
          <mesh position={[0.15, 0.6, 0.15]} rotation={[0, 0, 0.5]} castShadow>
              <coneGeometry args={[0.05, 0.2, 32]} />
              <primitive object={material} attach="material" />
          </mesh>
          <mesh position={[-0.15, 0.6, 0.15]} rotation={[0, 0, -0.5]} castShadow>
              <coneGeometry args={[0.05, 0.2, 32]} />
              <primitive object={material} attach="material" />
          </mesh>

          {/* Nose */}
          <mesh position={[0, 0.45, 0.45]} castShadow>
              <sphereGeometry args={[0.05, 16, 16]} />
              <primitive object={darkMaterial} attach="material" />
          </mesh>
      </group>

      {/* Legs */}
      {/* Front Left */}
      <mesh position={[0.15, 0.45, 0.4]} castShadow>
        <capsuleGeometry args={[0.06, 0.8, 8, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Front Right */}
      <mesh position={[-0.15, 0.45, 0.4]} castShadow>
        <capsuleGeometry args={[0.06, 0.8, 8, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Back Left */}
      <mesh position={[0.15, 0.45, -0.4]} castShadow>
        <capsuleGeometry args={[0.06, 0.8, 8, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Back Right */}
      <mesh position={[-0.15, 0.45, -0.4]} castShadow>
        <capsuleGeometry args={[0.06, 0.8, 8, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  )
}
