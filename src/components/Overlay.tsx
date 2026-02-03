import { Zone } from '../types'

interface OverlayProps {
  currentZone: Zone
  onZoneChange: (zone: Zone) => void
}

export function Overlay({ currentZone, onZoneChange }: OverlayProps) {
  const zones: Zone[] = ['GROVE', 'CLEARING', 'STREAM', 'DEEP_FOREST']

  const zoneText = {
    GROVE: 'The vertical rhythm of life.',
    CLEARING: 'Where light finds the floor.',
    STREAM: 'The slow dialogue of water and stone.',
    DEEP_FOREST: 'Silence, amplified.',
  }

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-12 z-10">
      {/* Header removed to avoid conflict with UI Title */}
      <div className="flex-none h-16"></div>

      <div className="flex flex-col items-center justify-center flex-1">
        <p key={currentZone} className="text-white/40 text-sm italic font-light tracking-widest animate-fade-in text-center">
          {zoneText[currentZone]}
        </p>
      </div>

      <div className="flex justify-center items-end w-full pb-8">
        <nav className="flex gap-8 pointer-events-auto bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/5">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => onZoneChange(zone)}
              className={`text-[10px] tracking-[0.2em] uppercase transition-all duration-500 ${
                currentZone === zone ? 'text-white font-medium' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {zone}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
