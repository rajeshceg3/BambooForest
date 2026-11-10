// Distances are metres. Ground is y=-0.01; each cloven hoof extends 0.045 below its pivot.
export const DEER_GROUND = -.01
export const DEER_CADENCE = .8
export const DEER_STANCE = .65
export const DEER_STRIDE = .28
export const DEER_SPEED = DEER_STRIDE * DEER_CADENCE / DEER_STANCE

export function sampleDeerFoot(time: number, phase: number, walking: boolean) {
  const t = ((time * DEER_CADENCE + phase) % 1 + 1) % 1
  const stance = t < DEER_STANCE
  const swing = (t - DEER_STANCE) / (1 - DEER_STANCE)
  const step = !walking ? 0 : stance
    ? DEER_STRIDE * .5 - t / DEER_STANCE * DEER_STRIDE
    : -DEER_STRIDE * .5 + swing * DEER_STRIDE
  const lift = walking && !stance ? Math.sin(swing * Math.PI) * .12 : 0
  return { step, lift, pivotY: DEER_GROUND + .045 + lift, stance, swing }
}
