import type { EffectComposer, SMAAEffect } from 'postprocessing'

// Populated only by the explicit composerAA=inspect comparison route.
export const compositorDiagnostic: { composer: EffectComposer | null; smaa: SMAAEffect | null } = { composer: null, smaa: null }
