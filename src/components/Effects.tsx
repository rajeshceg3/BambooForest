import { EffectComposer, Bloom, Noise, Vignette, ToneMapping, N8AO, DepthOfField, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode, SMAAPreset, EffectComposer as Composer, SMAAEffect } from 'postprocessing'
import { useRef, useMemo, useEffect } from 'react'
import { Autofocus } from './Autofocus'
import { useQuality } from './QualityContext'

import { compositorDiagnostic } from '../utils/compositorDiagnostic'

export function Effects() {
  const dofRef = useRef(null)
  const composerRef = useRef<Composer>(null)
  const smaaRef = useRef<SMAAEffect | null>(null)
  const target = useMemo(() => [0, 0, 0] as [number, number, number], [])
  const { tier } = useQuality()

  const isHigh = tier === 'HIGH'
  const isMedium = tier === 'MEDIUM'
  const isUltraLow = tier === 'ULTRA_LOW'
  const aaDiagnostic = new URLSearchParams(location.search).get('composerAA')
  const sampleCount = aaDiagnostic === 'smaa' || aaDiagnostic === 'none' ? 0 : aaDiagnostic === '2' ? 2 : 8
  useEffect(() => {
    if (aaDiagnostic !== 'inspect') return
    compositorDiagnostic.composer = composerRef.current
    compositorDiagnostic.smaa = smaaRef.current
    return () => { compositorDiagnostic.composer = null; compositorDiagnostic.smaa = null }
  }, [aaDiagnostic])

  return (
    <EffectComposer ref={composerRef} enableNormalPass={false} multisampling={sampleCount}>
      {/* Anti-aliasing first? Usually FXAA/SMAA is last, but EffectComposer handles it.
          Actually, SMAA should be one of the last passes, but tone mapping and vignette are also last.
          Usually ToneMapping is very last. Let's put SMAA before Noise/Vignette/ToneMapping.
      */}
      {isHigh || isMedium || (aaDiagnostic === 'smaa' || aaDiagnostic === 'inspect') ? <SMAA ref={node => { smaaRef.current = node as unknown as SMAAEffect | null }} preset={aaDiagnostic ? SMAAPreset.ULTRA : SMAAPreset.MEDIUM} /> : <></>}
      {isHigh || isMedium ? (
        <N8AO
          aoRadius={isHigh ? 0.4 : 0.28}
          intensity={isHigh ? 0.8 : 0.55}
          distanceFalloff={isHigh ? 0.2 : 0.12}
          halfRes
        />
      ) : (
        <></>
      )}
      {isUltraLow ? (
        <></>
      ) : (
        <Bloom
          luminanceThreshold={1}
          mipmapBlur={false}
          intensity={0.8} // Reduced for subtlety and performance
          radius={0.4}
        />
      )}
      {isHigh ? (
        <>
          <DepthOfField
            ref={dofRef}
            target={target}
            focusDistance={0.0} // Dynamic
            focalLength={0.02} // Realistic lens
            bokehScale={2}
            height={480}
          />
          <Autofocus dofRef={dofRef} />
        </>
      ) : (
        <></>
      )}
      {isUltraLow ? <></> : <Noise opacity={0.05} />}
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
