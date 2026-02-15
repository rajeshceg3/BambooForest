import { EffectComposer, Bloom, Noise, Vignette, ToneMapping, N8AO, DepthOfField } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useRef } from 'react'
import { Autofocus } from './Autofocus'

export function Effects() {
  const dofRef = useRef(null)

  return (
    <EffectComposer enableNormalPass={false}>
      <N8AO aoRadius={1.0} intensity={1.0} distanceFalloff={3.0} />
      <Bloom
        luminanceThreshold={1}
        mipmapBlur
        intensity={1.5}
        radius={0.4}
      />
      <DepthOfField
        ref={dofRef}
        target={[0, 0, 0]}
        focusDistance={0.0} // Dynamic
        focalLength={0.02} // Realistic lens (e.g. 50mm on 35mm sensor -> approx 0.05? Postprocessing units are weird)
        // Default focalLength is often 0.1?
        // Let's stick to previous roughly but tuned.
        // 0.3 was "miniature effect". Real cameras have longer focal lengths for portrait/macro.
        // But for landscape, shorter.
        // Let's try 0.1
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
