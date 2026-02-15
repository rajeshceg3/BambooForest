import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface AutofocusProps {
    dofRef: React.MutableRefObject<any>
    smoothTime?: number
    debug?: boolean
}

export function Autofocus({ dofRef, smoothTime = 0.2 }: AutofocusProps) {
    const { scene, camera } = useThree()
    const raycaster = useRef(new THREE.Raycaster())
    const center = useRef(new THREE.Vector2(0, 0))
    const target = useRef(new THREE.Vector3(0, 0, 0)) // Current focus target
    const aim = useRef(new THREE.Vector3(0, 0, 0))    // Where we want to focus

    useEffect(() => {
        // Enable layer 1 on camera so we can see objects on this layer
        camera.layers.enable(1)

        // Configure raycaster to ONLY check layer 1 (Focusable objects)
        // This optimizes performance by skipping grass (layer 0)
        raycaster.current.layers.set(1)
        raycaster.current.far = 50
    }, [camera])

    useFrame((_state, delta) => {
        if (!dofRef.current) return

        // 1. Raycast
        raycaster.current.setFromCamera(center.current, camera)

        // Intersect with scene (recursive)
        // Since we set layers, it will only check objects on Layer 1
        const intersects = raycaster.current.intersectObjects(scene.children, true)

        let hitPoint = null

        if (intersects.length > 0) {
            hitPoint = intersects[0].point
        }

        if (hitPoint) {
            aim.current.copy(hitPoint)
        } else {
            // If no hit, focus far away (infinity/horizon)
            // But smoothly. If we look at sky, focus distance should be large.
            // 20 units is "far" in this scale?
            // Bamboo forest is dense, 20 is okay.
            // Ray direction * 20 + position
            const farPoint = raycaster.current.ray.direction.clone().multiplyScalar(20).add(camera.position)
            aim.current.copy(farPoint)
        }

        // 2. Smooth Interpolation
        // Lerp speed proportional to 1/smoothTime
        const lerpSpeed = 1.0 / Math.max(0.001, smoothTime)
        target.current.lerp(aim.current, delta * lerpSpeed)

        // 3. Update Effect
        // @react-three/postprocessing DepthOfField exposes the effect in ref
        if (dofRef.current) {
             // Newer postprocessing
             if (dofRef.current.target) {
                 dofRef.current.target.copy(target.current)
             }
             // Fallback for older versions or if target isn't used automatically
             // (Some versions need calculateFocusDistance to be called or updated)
             // But usually target prop is enough.
        }
    })

    return null
}
