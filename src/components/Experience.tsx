import { Environment } from './Environment'
import { BambooForest } from './BambooForest'
import { Navigation } from './Navigation'
import { Fireflies } from './Fireflies'
import { Birds } from './Birds'
import { Stream } from './Stream'
import { StoneLantern } from './StoneLantern'
import { Deer } from './Deer'
import { Crane } from './Crane'
import { Butterflies } from './Butterflies'
import { Effects } from './Effects'
import { Zone } from '../types'

interface ExperienceProps {
  currentZone: Zone
}

export function Experience({ currentZone }: ExperienceProps) {
  return (
    <>
      <Navigation />
      <Environment currentZone={currentZone} />
      <BambooForest currentZone={currentZone} />
      <Fireflies count={currentZone === 'DEEP_FOREST' ? 250 : 150} />
      <Birds count={15} />
      <Stream />
      <StoneLantern position={[10, 0, 10]} rotation={[0, Math.PI / 4, 0]} />
      <Deer position={[-5, 0, -5]} rotation={[0, Math.PI / 3, 0]} />
      <Crane position={[-12, 0, 5]} rotation={[0, -Math.PI / 4, 0]} />
      <Butterflies count={8} />
      <Effects />
    </>
  )
}
