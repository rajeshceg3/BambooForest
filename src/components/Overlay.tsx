import { useState, useEffect } from 'react'
import { Zone } from '../types'

interface OverlayProps {
  currentZone: Zone
  onZoneChange: (zone: Zone) => void
}

export function Overlay({ currentZone, onZoneChange }: OverlayProps) {
  const zones: Zone[] = ['GROVE', 'CLEARING', 'STREAM', 'DEEP_FOREST']

  const zoneConfig = {
    GROVE: { name: 'Grove', text: 'The vertical rhythm of life.' },
    CLEARING: { name: 'Clearing', text: 'Where light finds the floor.' },
    STREAM: { name: 'Stream', text: 'The slow dialogue of water and stone.' },
    DEEP_FOREST: { name: 'Deep Forest', text: 'Silence, amplified.' },
  }

  const [showText, setShowText] = useState(false)

  // Trigger fade animation when zone changes
  useEffect(() => {
    setShowText(false)
    const timer = setTimeout(() => setShowText(true), 100)
    return () => clearTimeout(timer)
  }, [currentZone])

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between z-10">
      {/* Header Spacer - keeps text visual center appropriate */}
      <div className="flex-none h-32 md:h-0"></div>

      {/* Centered Zone Description */}
      <div className="flex flex-col items-center justify-center flex-1 text-center px-8 pb-20 md:pb-0 relative">
        <div className={`transition-all duration-1000 ease-out transform ${showText ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-sm'}`}>
           {/* Subtle backing for legibility against bright fog */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-black/20 blur-3xl rounded-full -z-10 pointer-events-none"></div>

           <h2 className="text-white/30 font-serif italic text-xl md:text-2xl tracking-widest mb-3 drop-shadow-md">
             {zoneConfig[currentZone].name}
           </h2>
           <div className="w-8 h-[1px] bg-white/20 mx-auto mb-4 box-shadow-lg"></div>
           <p className="text-white/90 font-light text-sm md:text-lg tracking-wide max-w-md mx-auto leading-relaxed [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
             {zoneConfig[currentZone].text}
           </p>
        </div>
      </div>

      {/* Navigation Area */}
      <div className="flex justify-center items-end w-full pb-8 md:pb-16 pointer-events-auto">

        {/* Mobile Navigation (Capsule) */}
        <nav className="md:hidden flex bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl overflow-hidden p-1">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => onZoneChange(zone)}
              className={`relative px-5 py-3 rounded-full transition-all duration-500 ${
                currentZone === zone ? 'bg-white/10 text-white' : 'text-white/40'
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest font-sans font-medium">
                {zoneConfig[zone].name}
              </span>
            </button>
          ))}
        </nav>

        {/* Desktop Navigation (Dots with Hover Reveal) */}
        <nav className="hidden md:flex gap-12 items-center">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => onZoneChange(zone)}
              className="group relative flex flex-col items-center justify-center w-4 h-16"
              aria-label={`Go to ${zoneConfig[zone].name}`}
            >
               {/* Label (Reveals on Hover) */}
               <span className={`absolute bottom-full mb-6 text-[10px] tracking-[0.3em] uppercase whitespace-nowrap transition-all duration-500 origin-bottom font-light ${
                 currentZone === zone
                    ? 'opacity-100 translate-y-0 text-white'
                    : 'opacity-0 translate-y-4 text-white/50 group-hover:opacity-100 group-hover:translate-y-0'
               }`}>
                 {zoneConfig[zone].name}
               </span>

               {/* Connector Line (Subtle) */}
               <div className={`absolute bottom-4 w-[1px] h-4 bg-gradient-to-t from-white/0 to-white/20 transition-all duration-500 ${
                   currentZone === zone ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-6 group-hover:opacity-50'
               }`}></div>

               {/* Dot / Indicator */}
               <div className={`transition-all duration-500 cubic-bezier(0.25, 1, 0.5, 1) ${
                  currentZone === zone
                    ? 'w-1.5 h-1.5 bg-white scale-150 ring-4 ring-white/10'
                    : 'w-1 h-1 bg-white/20 group-hover:bg-white/60 group-hover:scale-125'
               } rounded-full`} />
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
