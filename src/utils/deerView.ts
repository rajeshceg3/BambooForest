export interface StalkObstacle { x: number; z: number; radius: number }

// Pick a clear line to the animal without changing a single scene instance.
export function chooseDeerView(x: number, z: number, heading: number, stalks: StalkObstacle[]) {
  const radius = 5.5
  let best = { x: -4.6, z: -3, clearance: -Infinity, score: -Infinity }
  for (let i = 0; i < 48; i++) {
    const angle = heading + Math.PI * 2 * i / 48
    const dx = Math.sin(angle) * radius, dz = Math.cos(angle) * radius
    let clearance = 3
    for (const stalk of stalks) {
      const sx = stalk.x - x, sz = stalk.z - z
      const t = Math.max(0, Math.min(1, (sx * dx + sz * dz) / (radius * radius)))
      const distance = Math.hypot(sx - t * dx, sz - t * dz)
      // Keep the body and camera corridor clear, not only the centre ray.
      clearance = Math.min(clearance, distance - stalk.radius - (.85 - .4 * t))
    }
    const side = Math.abs(Math.sin(angle - heading))
    const front = Math.cos(angle - heading)
    const score = Math.min(clearance, .6) * 8 + side * .3 + front * .1
    if (score > best.score) best = {x: dx, z: dz, clearance, score}
  }
  return best
}
