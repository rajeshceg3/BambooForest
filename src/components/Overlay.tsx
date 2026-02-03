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
      <header className="opacity-20 hover:opacity-100 transition-opacity duration-1000">
        <h1 className="text-white text-lg font-extralight tracking-[0.5em] uppercase">Serenity</h1>
      </header>

      <div className="flex flex-col items-center justify-center flex-1">
        <p key={currentZone} className="text-white/40 text-sm italic font-light tracking-widest animate-fade-in">
          {zoneText[currentZone]}
        </p>
      </div>

      <div className="flex justify-between items-end">
        <nav className="flex flex-col gap-4 pointer-events-auto">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => onZoneChange(zone)}
              className={`text-left text-[10px] tracking-[0.3em] uppercase transition-all duration-1000 ${
                currentZone === zone ? 'text-white border-l-2 border-white pl-4' : 'text-white/20 hover:text-white/40 pl-0'
              }`}
            >
              {zone}
            </button>
          ))}
        </nav>

        <footer className="text-white/10 text-[9px] tracking-[0.4em] uppercase">
          Presence through stillness
        </footer>
      </div>
    </div>
  )
}
