import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type DeerState = 'IDLE' | 'GRAZE' | 'WALK' | 'ALERT';

export function Deer(props: any) {
  const groupRef = useRef<THREE.Group>(null)
  const neckRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)

  // Leg refs
  const legFLRef = useRef<THREE.Group>(null)
  const legFRRef = useRef<THREE.Group>(null)
  const legBLRef = useRef<THREE.Group>(null)
  const legBRRef = useRef<THREE.Group>(null)

  const { camera } = useThree()

  // State Management
  const state = useRef<DeerState>('IDLE')
  const stateTimer = useRef(0)

  // Movement
  const speed = 1.0 // m/s
  const turnSpeed = 2.0
  const targetDir = useRef(new THREE.Vector3(1, 0, 0))

  // Animation Phase
  const walkTime = useRef(0)

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
            float hash(vec3 p) {
                p  = fract( p*0.3183099 + .1 );
                p *= 17.0;
                return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
            }
            ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `
            #include <normal_fragment_maps>
            // Bump map from fur noise
            float scale = 120.0;
            float h = hash(vPos * scale);
            // Finite differences for bump
            float hx = hash((vPos + vec3(0.01, 0.0, 0.0)) * scale);
            float hy = hash((vPos + vec3(0.0, 0.01, 0.0)) * scale);
            float hz = hash((vPos + vec3(0.0, 0.0, 0.01)) * scale);

            vec3 bump = normalize(vec3(h - hx, h - hy, h - hz));
            normal = normalize(normal + bump * 0.3); // Perturb normal
            `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            float furNoise = hash(vPos * 120.0);
            float mixVal = 0.85 + 0.3 * furNoise;
            diffuseColor.rgb *= mixVal;

            vec3 viewDir = normalize(vViewPosition);
            vec3 viewNormal = normalize(vNormal); // Perturbed normal
            float fresnel = dot(viewDir, viewNormal);
            fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
            fresnel = pow(fresnel, 2.5); // Softer falloff

            // Warm Rim Light
            vec3 rimColor = vec3(1.0, 0.9, 0.7);
            diffuseColor.rgb += rimColor * fresnel * 0.6;
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

  useEffect(() => {
    if (groupRef.current) {
        groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.layers.enable(1)
            }
        })
    }
  }, [])

  useFrame((stateContext, delta) => {
    if (!groupRef.current) return

    const t = stateContext.clock.getElapsedTime()
    stateTimer.current -= delta

    const playerPos = camera.position
    const deerPos = groupRef.current.position
    const distToPlayer = deerPos.distanceTo(playerPos)

    // State Logic
    if (stateTimer.current <= 0) {
        // Decide next state based on current state and environment
        const r = Math.random()

        if (state.current === 'ALERT') {
            // Calm down if player is far
            if (distToPlayer > 15) {
                state.current = 'IDLE'
                stateTimer.current = 2 + Math.random() * 3
            } else {
                // Stay alert or run away? For now just stay alert and track
                stateTimer.current = 1.0
            }
        } else if (distToPlayer < 8) {
            // Get alerted
            state.current = 'ALERT'
            stateTimer.current = 3.0 + Math.random() * 2.0
        } else {
            // Standard behavior cycle
            if (state.current === 'WALK') {
                state.current = r > 0.5 ? 'GRAZE' : 'IDLE'
                stateTimer.current = 4 + Math.random() * 5
            } else {
                state.current = 'WALK'
                stateTimer.current = 5 + Math.random() * 5
                // Pick new random direction
                const angle = Math.random() * Math.PI * 2
                targetDir.current.set(Math.sin(angle), 0, Math.cos(angle))
            }
        }
    }

    // Force Alert if very close
    if (distToPlayer < 5 && state.current !== 'ALERT') {
        state.current = 'ALERT'
        stateTimer.current = 2.0
    }

    // --- Behavior Execution ---

    // 1. Body Movement (Walk)
    const isWalking = state.current === 'WALK'

    if (isWalking) {
        walkTime.current += delta * speed * 3.0 // Animation speed

        // Rotate body towards targetDir
        const currentRot = groupRef.current.rotation.y
        const targetRot = Math.atan2(targetDir.current.x, targetDir.current.z)

        // Smooth turn
        let rotDiff = targetRot - currentRot
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2

        groupRef.current.rotation.y += rotDiff * delta * turnSpeed

        // Move forward
        groupRef.current.translateZ(speed * delta * 0.5) // 0.5 m/s actual speed

        // Bobbing
        groupRef.current.position.y = Math.sin(walkTime.current * 2.0) * 0.02
    } else {
        // Idle bob
        groupRef.current.position.y = Math.sin(t * 1.0) * 0.005
    }

    // 2. Leg Animation (Inverse Kinematics-ish)
    // Walk cycle: 0..1
    // Stance: 0.0-0.5 (Leg moves back)
    // Swing: 0.5-1.0 (Leg moves forward and up)

    const legAmp = 0.3

    const animateLeg = (leg: THREE.Group, offset: number) => {
        if (!leg) return

        if (isWalking) {
            const phase = (walkTime.current + offset) % 1.0

            if (phase < 0.5) {
                // Stance Phase (Plant)
                // Leg rotates backward linearly to counteract body forward motion
                // Map 0..0.5 to 0.5..-0.5 rotation?
                // Actually, just rotation.x
                const p = phase / 0.5 // 0..1
                leg.rotation.x = THREE.MathUtils.lerp(legAmp, -legAmp, p)
                leg.position.y = -0.15 // Grounded (relative height)

                // Knee straightens slightly?
                // Simplified: just rotate hip
            } else {
                // Swing Phase (Lift)
                const p = (phase - 0.5) / 0.5 // 0..1
                // Parabolic lift
                const lift = Math.sin(p * Math.PI) * 0.15
                // Move forward
                leg.rotation.x = THREE.MathUtils.lerp(-legAmp, legAmp, p)
                leg.position.y = -0.15 + lift
            }
        } else {
            // Idle stance
            leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 5)
            leg.position.y = THREE.MathUtils.lerp(leg.position.y, -0.15, delta * 5)
        }
    }

    // Trot gait: Diagonal pairs
    // FL (0.0), BR (0.0)
    // FR (0.5), BL (0.5)
    animateLeg(legFLRef.current!, 0.0)
    animateLeg(legBRRef.current!, 0.0)
    animateLeg(legFRRef.current!, 0.5)
    animateLeg(legBLRef.current!, 0.5)


    // 3. Head/Neck Animation
    if (neckRef.current && headRef.current) {
        let targetHeadRotY = 0
        let targetHeadRotX = 0
        let targetNeckRotX = -0.2 // Default upright

        if (state.current === 'ALERT') {
             // Look at player
             // We need local rotation.
             // Vector to player in local space?
             // Simplification: Look at world position

             // Get direction to player
             const dir = new THREE.Vector3().subVectors(playerPos, groupRef.current.position).normalize()

             // Convert to local angle relative to body forward (Z)
             // Body forward is (sin(rotY), 0, cos(rotY))
             // Actually, simplest is to use lookAt on a dummy and grab rotation, but let's approximate

             // Angle difference
             const bodyDir = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion).normalize()
             const angleY = Math.atan2(dir.x, dir.z) - Math.atan2(bodyDir.x, bodyDir.z)

             let ay = angleY
             while (ay > Math.PI) ay -= Math.PI * 2
             while (ay < -Math.PI) ay += Math.PI * 2

             // Clamp head turn
             ay = THREE.MathUtils.clamp(ay, -1.5, 1.5)

             targetHeadRotY = ay
             targetHeadRotX = 0.0 // Stare straight
             targetNeckRotX = -0.4 // Head up high
        } else if (state.current === 'GRAZE') {
            targetNeckRotX = 0.8 // Head down
            targetHeadRotX = 0.5 // Snout down
            targetHeadRotY = Math.sin(t * 0.5) * 0.2 // Scan ground
        } else {
            // Walk/Idle - Look ahead with slight bob
            targetHeadRotY = Math.sin(t * 0.3) * 0.1
            targetNeckRotX = -0.2 + Math.sin(t * 0.5) * 0.05
        }

        // Smoothly interpolate
        neckRef.current.rotation.x = THREE.MathUtils.lerp(neckRef.current.rotation.x, targetNeckRotX, delta * 2)

        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetHeadRotY, delta * 5)
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetHeadRotX, delta * 5)
    }
  })

  // Geometry Constants
  // Using previously defined geometry, but now rigged properly with Refs

  return (
    <group ref={groupRef} {...props}>
      {/* Shadow */}
      {/* ContactShadows is expensive if many deer, but we have 1. Keep it. */}

      {/* Main Body Group - offset up so (0,0,0) is ground */}
      <group position={[0, 0.85, 0]}>

        {/* Torso/Ribcage */}
        <mesh name="ribcage" position={[0, 0, 0.15]} castShadow>
             <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
             <primitive object={material} attach="material" />
        </mesh>

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
        <group ref={neckRef} position={[0, 0.35, 0.45]} rotation={[-0.2, 0, 0]}>
            {/* Neck base */}
            <mesh position={[0, 0.25, 0]} castShadow>
                <coneGeometry args={[0.12, 0.6, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Head Group */}
            <group ref={headRef} position={[0, 0.55, 0.1]} rotation={[0.2, 0, 0]}>
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

        {/* Legs - Updated Structure for Animation */}
        {/* Pivot points need to be at the shoulder/hip joint */}

        {/* Front Left */}
        <group ref={legFLRef} position={[0.15, 0.1, 0.35]}>
            {/* Thigh/Shoulder */}
            <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0]} castShadow>
                <coneGeometry args={[0.08, 0.4, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Knee Joint */}
            <mesh position={[0, -0.4, 0]} castShadow>
                <sphereGeometry args={[0.055, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Shin */}
            <mesh position={[0, -0.6, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.03, 0.4, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
             {/* Hoof */}
            <mesh position={[0, -0.8, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

        {/* Front Right */}
        <group ref={legFRRef} position={[-0.15, 0.1, 0.35]}>
             <mesh position={[0, -0.2, 0]} castShadow>
                <coneGeometry args={[0.08, 0.4, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.4, 0]} castShadow>
                <sphereGeometry args={[0.055, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.6, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.03, 0.4, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.8, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

        {/* Back Left */}
        <group ref={legBLRef} position={[0.15, 0.05, -0.35]}>
             {/* Thigh (Haunch) */}
             <mesh position={[0, -0.2, 0]} rotation={[0.2, 0, 0]} castShadow>
                <coneGeometry args={[0.1, 0.45, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
             {/* Hock Joint */}
            <mesh position={[0, -0.4, 0.05]} castShadow>
                <sphereGeometry args={[0.06, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            {/* Shin */}
            <mesh position={[0, -0.6, 0]} rotation={[-0.1, 0, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.035, 0.45, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
             <mesh position={[0, -0.82, -0.02]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

        {/* Back Right */}
        <group ref={legBRRef} position={[-0.15, 0.05, -0.35]}>
             <mesh position={[0, -0.2, 0]} rotation={[0.2, 0, 0]} castShadow>
                <coneGeometry args={[0.1, 0.45, 16]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.4, 0.05]} castShadow>
                <sphereGeometry args={[0.06, 8, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
            <mesh position={[0, -0.6, 0]} rotation={[-0.1, 0, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.035, 0.45, 8]} />
                <primitive object={material} attach="material" />
            </mesh>
             <mesh position={[0, -0.82, -0.02]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.05, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
        </group>

      </group>
    </group>
  )
}
