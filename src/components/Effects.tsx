import { EffectComposer, Bloom, Noise, Vignette, ToneMapping, N8AO, DepthOfField } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export function Effects() {
  return (
    <EffectComposer enableNormalPass={false}>
      <N8AO aoRadius={1.0} intensity={2.0} distanceFalloff={3.0} />
      <Bloom
        luminanceThreshold={1}
        mipmapBlur
        intensity={1.5}
        radius={0.4}
      />
      <DepthOfField focusDistance={0.02} focalLength={0.5} bokehScale={3} height={480} />
      <Noise opacity={0.05} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
