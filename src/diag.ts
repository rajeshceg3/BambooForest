// Diagnostic harness for isolating the renderer-kill crash on weak GPUs.
// All params are opt-in; production behavior is unchanged without them.
//   ?qtier=ultra_low|low|medium|high   force the quality tier
//   ?minimal=1               strip the scene to the bare pipeline
//   ?with=shadows,cover,bamboo,effects,critters,stream  re-enable subsystems on minimal
//   ?noshadows=1 & nocover=1 & nobamboo=1 & noeffects=1 & nocritters=1
const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
const flag = (name: string) => params.get(name) === '1'
const withList = new Set((params.get('with') || '').split(',').filter(Boolean))
const minimal = flag('minimal')
const forced = (params.get('qtier') || '').toUpperCase()

export const DIAG = {
  minimal,
  noSpatial: flag('nospatial'),
  forceTier: (forced === 'ULTRA_LOW' || forced === 'LOW' || forced === 'MEDIUM' || forced === 'HIGH' ? forced : null) as 'ULTRA_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | null,
  noShadows: flag('noshadows') || (minimal && !withList.has('shadows')),
  noCover: flag('nocover') || (minimal && !withList.has('cover')),
  noBamboo: flag('nobamboo') || (minimal && !withList.has('bamboo')),
  noEffects: flag('noeffects') || (minimal && !withList.has('effects')),
  noCritters: flag('nocritters') || (minimal && !withList.has('critters')),
  noStream: flag('nostream') || (minimal && !withList.has('stream')),
  // Base-pipeline isolation flags (standalone; minimal keeps its meaning for comparability):
  noEnv: flag('noenv'),
  noAntialias: flag('noantialias'),
  noLantern: flag('nolantern'),
  flatGround: flag('flatground'),
}
