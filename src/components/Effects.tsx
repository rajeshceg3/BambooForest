import { EffectComposer, Bloom, Noise, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export function Effects() {
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom
        luminanceThreshold={1}
        mipmapBlur
        intensity={1.5}
        radius={0.4}
      />
      <Noise opacity={0.05} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
