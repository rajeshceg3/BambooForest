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
import { TourController } from './TourController'
import { useTour } from './TourContext'
import { Zone } from '../types'
import { DustMotes } from './DustMotes'
import { QualityFrameSampler, useQuality, type QualityTier } from './QualityContext'

interface ExperienceProps {
  currentZone: Zone
  onZoneChange: (zone: Zone) => void
  isIdle?: boolean
}

export function Experience({ currentZone, onZoneChange, isIdle = false }: ExperienceProps) {
  const { isActive } = useTour()
  const { tier } = useQuality()

  const preset = getZoneLodPreset(currentZone, tier)
  const dustCount = isIdle ? preset.dustIdle : preset.dust

  return (
    <>
      <QualityFrameSampler />
      <Navigation enabled={!isActive} />
      <Environment currentZone={currentZone} />
      <BambooForest currentZone={currentZone} count={preset.bamboo} />
      <Fireflies count={preset.fireflies} isIdle={isIdle} />
      <DustMotes count={dustCount} />
      <Birds count={preset.birds} />
      <Stream />
      <StoneLantern position={[10, 0, 10]} rotation={[0, Math.PI / 4, 0]} />
      <Deer position={[-5, 0, -5]} rotation={[0, Math.PI / 3, 0]} />
      <Crane position={[-12, 0, 5]} rotation={[0, -Math.PI / 4, 0]} />
      <Butterflies count={preset.butterflies} />
      <Effects />
      <TourController onZoneChange={onZoneChange} />
    </>
  )
}

interface ZoneLodPreset {
  bamboo: number
  dust: number
  dustIdle: number
  fireflies: number
  birds: number
  butterflies: number
}

const zoneLodPresets: Record<Zone, Record<QualityTier, ZoneLodPreset>> = {
  GROVE: {
    HIGH: { bamboo: 15000, dust: 2000, dustIdle: 4000, fireflies: 150, birds: 15, butterflies: 8 },
    MEDIUM: { bamboo: 11500, dust: 1400, dustIdle: 2600, fireflies: 105, birds: 11, butterflies: 6 },
    LOW: { bamboo: 8500, dust: 900, dustIdle: 1800, fireflies: 70, birds: 8, butterflies: 4 },
  },
  CLEARING: {
    HIGH: { bamboo: 12000, dust: 1600, dustIdle: 3200, fireflies: 120, birds: 14, butterflies: 10 },
    MEDIUM: { bamboo: 9600, dust: 1200, dustIdle: 2200, fireflies: 85, birds: 10, butterflies: 7 },
    LOW: { bamboo: 7000, dust: 800, dustIdle: 1600, fireflies: 60, birds: 7, butterflies: 5 },
  },
  STREAM: {
    HIGH: { bamboo: 13000, dust: 1500, dustIdle: 2800, fireflies: 130, birds: 16, butterflies: 9 },
    MEDIUM: { bamboo: 10100, dust: 1100, dustIdle: 2100, fireflies: 92, birds: 12, butterflies: 7 },
    LOW: { bamboo: 7600, dust: 760, dustIdle: 1450, fireflies: 65, birds: 8, butterflies: 5 },
  },
  // Preserve dense ambience in deep forest even on lower tiers for perceptual richness.
  DEEP_FOREST: {
    HIGH: { bamboo: 18000, dust: 2600, dustIdle: 4800, fireflies: 250, birds: 18, butterflies: 10 },
    MEDIUM: { bamboo: 15000, dust: 2100, dustIdle: 3800, fireflies: 205, birds: 14, butterflies: 8 },
    LOW: { bamboo: 12500, dust: 1600, dustIdle: 3000, fireflies: 165, birds: 11, butterflies: 6 },
  },
}

function getZoneLodPreset(zone: Zone, tier: QualityTier): ZoneLodPreset {
  return zoneLodPresets[zone][tier]
}
