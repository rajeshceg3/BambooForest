import { EffectComposer, Bloom, Noise, Vignette, ToneMapping, N8AO, DepthOfField, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useRef, useMemo } from 'react'
import { Autofocus } from './Autofocus'

export function Effects() {
  const dofRef = useRef(null)
  const target = useMemo(() => [0, 0, 0] as [number, number, number], [])

  return (
    <EffectComposer enableNormalPass={false}>
      {/* Anti-aliasing first? Usually FXAA/SMAA is last, but EffectComposer handles it.
          Actually, SMAA should be one of the last passes, but tone mapping and vignette are also last.
          Usually ToneMapping is very last. Let's put SMAA before Noise/Vignette/ToneMapping.
      */}
      <SMAA />
      <N8AO aoRadius={1.0} intensity={0.8} distanceFalloff={1.0} halfRes />
      <Bloom
        luminanceThreshold={1}
        mipmapBlur={false}
        intensity={0.8} // Reduced for subtlety and performance
        radius={0.4}
      />
      <DepthOfField
        ref={dofRef}
        target={target}
        focusDistance={0.0} // Dynamic
        focalLength={0.02} // Realistic lens
        bokehScale={2}
        height={480}
      />
      <Autofocus dofRef={dofRef} />
      <Noise opacity={0.05} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
