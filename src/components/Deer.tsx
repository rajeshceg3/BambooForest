import { sampleDeerFoot, DEER_SPEED } from '../utils/deerMotion'
import { reducedMotion } from '../utils/motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'

type Behaviour = 'IDLE' | 'GRAZE' | 'WALK' | 'ALERT'
type GroupProps = ThreeElements['group']

// Smooth union volumes follow roe-deer proportions in the source note.
// One skinned surface blends shoulder, haunch, chest, neck base and muzzle.
function anatomyGeometry() {
  const n = 56, scale = 1.2, helperMaterial = new THREE.MeshBasicMaterial()
  const mc = new MarchingCubes(n, helperMaterial, false, false, 20000)
  mc.isolation = 0
  const smoothMin = (a: number, b: number, k: number) => {
    const h = Math.max(k - Math.abs(a-b), 0) / k
    return Math.min(a,b) - h*h*k*.25
  }
  const ellipsoid = (x: number,y: number,z: number,cx: number,cy: number,cz: number,rx: number,ry: number,rz: number,angle=0) => {
    const dx=x-cx, dy=(y-cy)*Math.cos(angle)+(z-cz)*Math.sin(angle), dz=-(y-cy)*Math.sin(angle)+(z-cz)*Math.cos(angle)
    const k0=Math.sqrt((dx/rx)**2+(dy/ry)**2+(dz/rz)**2)
    const k1=Math.sqrt((dx/rx/rx)**2+(dy/ry/ry)**2+(dz/rz/rz)**2)
    return k0*(k0-1)/Math.max(k1,.00001)
  }
  for(let iz=0;iz<n;iz++) for(let iy=0;iy<n;iy++) for(let ix=0;ix<n;ix++) {
    const x=(ix/n*2-1)*scale,y=(iy/n*2-1)*scale+1,z=(iz/n*2-1)*scale
    let d=ellipsoid(x,y,z,0,1.07,0,.21,.255,.64)
    d=smoothMin(d,ellipsoid(x,y,z,0,1.08,.39,.205,.28,.26),.12)
    d=smoothMin(d,ellipsoid(x,y,z,0,1.09,-.39,.215,.265,.26),.12)
    d=smoothMin(d,ellipsoid(x,y,z,0,1.30,.46,.15,.31,.175,.45),.14)
    d=smoothMin(d,ellipsoid(x,y,z,0,1.57,.59,.087,.30,.11,.35),.11)
    d=smoothMin(d,ellipsoid(x,y,z,0,1.76,.69,.095,.13,.145),.065)
    d=smoothMin(d,ellipsoid(x,y,z,0,1.69,.85,.06,.065,.145),.06)
    mc.field[iz*n*n+iy*n+ix]=-d
  }
  mc.update()
  const count=mc.geometry.drawRange.count, g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(mc.geometry.attributes.position.array.slice(0,count*3)),3))
  g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(mc.geometry.attributes.normal.array.slice(0,count*3)),3))
  g.scale(scale,scale,scale);g.translate(0,1,0)
  const pos=g.attributes.position, weights:number[]=[],indices:number[]=[],colors:number[]=[]
  for(let i=0;i<pos.count;i++) {
    const y=pos.getY(i),z=pos.getZ(i),x=pos.getX(i)
    const neck=THREE.MathUtils.smoothstep(y,1.25,1.58)*THREE.MathUtils.smoothstep(z,.16,.38)
    const head=Math.max(THREE.MathUtils.smoothstep(y,1.61,1.72),THREE.MathUtils.smoothstep(z,.69,.78))*THREE.MathUtils.smoothstep(y,1.53,1.64)
    indices.push(0,1,2,0);weights.push(1-neck,neck*(1-head),neck*head,0)
    const noise=(Math.sin(x*179+y*121+z*153)*Math.sin(x*263-y*191+z*89))*.006
    const belly=THREE.MathUtils.smoothstep(1.05-y,0,.32)*.11
    const c=new THREE.Color('#8b603c');c.offsetHSL(0,-belly,noise+belly)
    colors.push(c.r,c.g,c.b)
  }
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  mc.geometry.dispose();helperMaterial.dispose()
  return g
}

function Ellipsoid({ position, scale, material, rotation }: {position: [number, number, number], scale: [number, number, number], material: THREE.Material, rotation?: [number, number, number]}) {
  return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow><sphereGeometry args={[1, 24, 16]} /></mesh>
}

function groundShadow() {
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64
  const ctx=canvas.getContext('2d')!
  const gradient=ctx.createRadialGradient(32,32,1,32,32,31)
  gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(1,'rgba(0,0,0,0)')
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64)
  const texture=new THREE.CanvasTexture(canvas)
  return new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.45})
}
const UP = new THREE.Vector3(0, 1, 0)
function segment(mesh: THREE.Mesh | null, a: THREE.Vector3, b: THREE.Vector3, width: number, depth = width) {
  if (!mesh) return
  mesh.position.copy(a).add(b).multiplyScalar(.5)
  mesh.quaternion.setFromUnitVectors(UP, new THREE.Vector3().subVectors(b, a).normalize())
  mesh.scale.set(width, a.distanceTo(b) * .56, depth)
}

function Leg({ x, z, rear, phase, body, material, hoofMaterial }: {x: number, z: number, rear: boolean, phase: number, body: React.MutableRefObject<{time: number, walking: boolean, feet: number[]}>, material: THREE.Material, hoofMaterial: THREE.Material}) {
  const upper = useRef<THREE.Mesh>(null), middle = useRef<THREE.Mesh>(null), lower = useRef<THREE.Mesh>(null)
  const knee = useRef<THREE.Mesh>(null), hock = useRef<THREE.Mesh>(null), hoof = useRef<THREE.Group>(null)
  const contact = useRef<THREE.Mesh>(null)
  const shadow = useMemo(groundShadow, [])
  useEffect(()=>()=>{shadow.map?.dispose();shadow.dispose()},[shadow])
  const vectors = useMemo(() => Array.from({length: 4}, () => new THREE.Vector3()), [])
  const pose = useCallback(() => {
    const walking = body.current.walking && !reducedMotion.matches
    const {step,lift,pivotY,stance,swing} = sampleDeerFoot(body.current.time,phase,walking)
    const [hip, joint, ankle, foot] = vectors
    hip.set(x, rear ? 1.02 : 1.06, z)
    foot.set(x, pivotY, z + step + (rear ? -.07 : .025))
    body.current.feet[Math.round(phase*4)] = foot.y - .045
    // Three articulated sections: front elbow/carpus and rear stifle/hock.
    joint.copy(hip).lerp(foot, .38); joint.z += rear ? .17 : -.075
    ankle.copy(hip).lerp(foot, .73); ankle.z += rear ? -.10 : .018
    segment(upper.current, hip, joint, rear ? .075 : .05, rear ? .11 : .065)
    segment(middle.current, joint, ankle, rear ? .031 : .026)
    segment(lower.current, ankle, foot, .018, .022)
    if (knee.current) { knee.current.position.copy(joint); knee.current.scale.setScalar(rear ? .038 : .032) }
    if (hock.current) { hock.current.position.copy(ankle); hock.current.scale.setScalar(.027) }
    if(contact.current) {contact.current.position.set(foot.x,-.008,foot.z);shadow.opacity=.45*(1-lift/.15)}
    if (hoof.current) { hoof.current.position.copy(foot); hoof.current.rotation.x = walking && !stance ? -.15 * Math.sin(swing*Math.PI) : 0 }
  }, [body,phase,rear,shadow,vectors,x,z])
  useLayoutEffect(pose, [pose])
  useFrame(pose)
  return <group>
    <mesh ref={contact} material={shadow} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.15,.20]} /></mesh>
    <mesh ref={upper} material={material} castShadow><sphereGeometry args={[1, 16, 12]} /></mesh>
    <mesh ref={middle} material={material} castShadow><sphereGeometry args={[1, 16, 12]} /></mesh>
    <mesh ref={lower} material={material} castShadow><sphereGeometry args={[1, 16, 12]} /></mesh>
    <mesh ref={knee} material={material} castShadow><sphereGeometry args={[1, 16, 12]} /></mesh>
    <mesh ref={hock} material={material} castShadow><sphereGeometry args={[1, 16, 12]} /></mesh>
    <group ref={hoof}>
      <Ellipsoid position={[-.014, -.012, .012]} scale={[.014, .033, .047]} material={hoofMaterial} />
      <Ellipsoid position={[.014, -.012, .012]} scale={[.014, .033, .047]} material={hoofMaterial} />
    </group>
  </group>
}

export function Deer(props: GroupProps) {
  const root = useRef<THREE.Group>(null), skin = useRef<THREE.SkinnedMesh>(null)
  const body = useRef({time: 0, walking: false, feet: [-.01,-.01,-.01,-.01]}), state = useRef<Behaviour>('IDLE'), timer = useRef(0)
  const direction = useRef(new THREE.Vector3(1, 0, 0)), elapsed = useRef(0), telemetry = useRef(0)
  const { camera, gl } = useThree()
  const rig = useMemo(() => {
    const base=new THREE.Bone(),neck=new THREE.Bone(),head=new THREE.Bone()
    neck.position.set(0,1.13,.36);head.position.set(0,.59,.30);base.add(neck);neck.add(head)
    return {base,neck,head,skeleton:new THREE.Skeleton([base,neck,head])}
  }, [])
  const assets = useMemo(() => ({
    body: anatomyGeometry(),
    surface: new THREE.MeshStandardMaterial({vertexColors:true,roughness:.97}),
    coat: new THREE.MeshStandardMaterial({color: '#91623c', roughness: .95}),
    light: new THREE.MeshStandardMaterial({color: '#b79a76', roughness: .95}),
    dark: new THREE.MeshStandardMaterial({color: '#30271f', roughness: .85}),
    eye: new THREE.MeshStandardMaterial({color: '#130e0a', roughness: .22}),
    innerEar: new THREE.MeshStandardMaterial({color: '#6b5143', roughness: 1})
  }), [])
  useLayoutEffect(() => {if(skin.current){skin.current.add(rig.base);skin.current.bind(rig.skeleton)} return()=>{Object.values(assets).forEach(a=>a.dispose());rig.skeleton.dispose()}}, [assets,rig])
  useFrame((_, rawDelta) => {
    if (!root.current) return
    const dt = Math.min(rawDelta, .05)
    elapsed.current += dt
    if (!reducedMotion.matches) {
      const distance = root.current.position.distanceTo(camera.position)
      timer.current -= dt
      if (distance < 4.5) { state.current = 'ALERT'; timer.current = 2 }
      else if (timer.current <= 0) {
        if (state.current === 'WALK') { state.current = 'GRAZE'; timer.current = 4 }
        else { state.current = 'WALK'; timer.current = 6; const a = Math.random() * Math.PI * 2; direction.current.set(Math.sin(a), 0, Math.cos(a)) }
      }
      body.current.walking = state.current === 'WALK'
      body.current.time += dt
      if (body.current.walking) {
        const wanted = Math.atan2(direction.current.x, direction.current.z)
        let diff = wanted - root.current.rotation.y
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        root.current.rotation.y += diff * (1 - Math.exp(-dt * 2))
        root.current.translateZ(DEER_SPEED * dt)
      }
      // Same dry-bank exclusion as the seeded vegetation. No root bob below ground.
      const bank = (root.current.position.x - root.current.position.z + 15) / Math.SQRT2
      if (bank < 12) { const d = (12 - bank) / Math.SQRT2; root.current.position.x += d; root.current.position.z -= d; direction.current.set(1, 0, -1).normalize() }
      root.current.position.y = 0
      if (rig.neck && rig.head) {
        const graze = state.current === 'GRAZE'
        rig.neck.rotation.x = THREE.MathUtils.damp(rig.neck.rotation.x, graze ? 1.35 : state.current === 'ALERT' ? -.12 : .08, 3, dt)
        let look = 0
        if (state.current === 'ALERT') {
          look = Math.atan2(camera.position.x-root.current.position.x, camera.position.z-root.current.position.z)-root.current.rotation.y
          while (look > Math.PI) look -= Math.PI * 2
          while (look < -Math.PI) look += Math.PI * 2
        }
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, THREE.MathUtils.clamp(look, -.8, .8), 3, dt)
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, graze ? .4 : -.08, 3, dt)
      }
    } else body.current.walking = false
    telemetry.current += dt
    if (telemetry.current > .25) {
      telemetry.current = 0
      gl.domElement.dataset.deerState = reducedMotion.matches ? 'REDUCED' : state.current
      gl.domElement.dataset.deerPosition = root.current.position.toArray().map(v=>v.toFixed(3)).join(',')
      gl.domElement.dataset.deerPhase = body.current.time.toFixed(3)
      gl.domElement.dataset.deerHoofBottoms = body.current.feet.map(y=>y.toFixed(4)).join(',')
    }
  })
  return <group ref={root} {...props} name="roe-deer">
    <skinnedMesh ref={skin} skeleton={rig.skeleton} geometry={assets.body} material={assets.surface} castShadow />
    <Ellipsoid position={[0,1.09,-.607]} scale={[.13,.16,.038]} material={assets.light} />
    <Ellipsoid position={[0,1.16,-.65]} scale={[.035,.065,.035]} rotation={[-.45,0,0]} material={assets.coat} />
    {createPortal(<>
      <Ellipsoid position={[0,-.06,.29]} scale={[.057,.037,.037]} material={assets.dark} />
      <Ellipsoid position={[0,-.105,.17]} scale={[.043,.017,.095]} material={assets.light} />
      {[-1,1].map(side=><group key={side}>
        <Ellipsoid position={[side*.085,.045,.083]} scale={[.017,.021,.025]} material={assets.eye} />
        <group position={[side*.075,.13,-.025]} rotation={[.1,0,side*-.75]}>
          <Ellipsoid position={[0,.10,0]} scale={[.065,.115,.028]} material={assets.coat} />
          <Ellipsoid position={[0,.105,.022]} scale={[.045,.082,.009]} material={assets.innerEar} />
        </group>
      </group>)}
    </>, rig.head)}
    <Leg x={.145} z={.39} rear={false} phase={0} body={body} material={assets.coat} hoofMaterial={assets.dark} />
    <Leg x={-.145} z={.39} rear={false} phase={.5} body={body} material={assets.coat} hoofMaterial={assets.dark} />
    <Leg x={.15} z={-.39} rear phase={.25} body={body} material={assets.coat} hoofMaterial={assets.dark} />
    <Leg x={-.15} z={-.39} rear phase={.75} body={body} material={assets.coat} hoofMaterial={assets.dark} />
  </group>
}
