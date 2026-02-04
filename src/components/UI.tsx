import { useState } from 'react'
import { useProgress } from '@react-three/drei'

interface UIProps {
  audioEnabled: boolean
  onToggleAudio: () => void
}

export const UI = ({ audioEnabled, onToggleAudio }: UIProps) => {
  const [started, setStarted] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { progress, active } = useProgress()

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between text-white font-sans select-none">

      {/* Loader */}
      <div
        className={`absolute inset-0 bg-stone-900 z-[60] flex items-center justify-center transition-opacity duration-1000 ease-in-out ${progress === 100 || !active ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="text-center">
          <p className="font-serif italic text-white/50 text-xl tracking-widest">
            {progress.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Intro Screen */}
      <div
        className={`absolute inset-0 z-[40] flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-2000 ease-in-out ${started ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
      >
        <div className="text-center p-8 max-w-lg">
          <h1 className="font-serif text-5xl md:text-7xl text-white/90 mb-4 tracking-tight drop-shadow-lg animate-fade-in-up">
            Bamboo Forest
          </h1>
          <p className="font-serif italic text-white/70 text-lg md:text-xl mb-12 tracking-wide font-light animate-fade-in-up delay-100">
            A digital sanctuary.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="group relative px-4 py-2 overflow-hidden transition-all duration-500 animate-fade-in-up delay-200"
          >
            <span className="relative z-10 font-sans text-xs md:text-sm tracking-[0.3em] uppercase text-white/70 group-hover:text-white transition-colors">
              Enter Experience
            </span>
            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
          </button>
        </div>
      </div>

      {/* HUD - Visible only when started */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 delay-500 ${started ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Top Left: Title (Subtle) */}
        <div className="absolute top-6 left-6 md:top-8 md:left-8 opacity-30 hover:opacity-80 transition-opacity duration-500 pointer-events-auto mix-blend-difference">
           <span className="font-serif text-sm md:text-base tracking-widest uppercase text-white/80">
             Bamboo Forest
           </span>
        </div>

        {/* Bottom Left: Audio Toggle */}
        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 pointer-events-auto">
          <button
            onClick={onToggleAudio}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 group hover:scale-110"
            aria-label={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 group-hover:text-white transition-colors">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 group-hover:text-white transition-colors">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </button>
        </div>

        {/* Bottom Right: Info Button */}
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 pointer-events-auto">
          <button
            onClick={() => setAboutOpen(true)}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 group hover:scale-110"
            aria-label="About"
          >
            <span className="font-serif italic text-xl md:text-2xl text-white/70 group-hover:text-white transition-colors">i</span>
          </button>
        </div>
      </div>

      {/* About Modal */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50 transition-all duration-700 ${aboutOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAboutOpen(false)
        }}
      >
        <div className="max-w-2xl w-full bg-stone-900/40 border border-white/10 p-8 md:p-12 rounded-sm shadow-2xl relative overflow-hidden">
          {/* Decorative vertical line */}
          <div className="absolute left-6 top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent hidden md:block"></div>

          <button
            onClick={() => setAboutOpen(false)}
            className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="md:pl-12">
            <h2 className="font-serif text-3xl md:text-4xl text-white/90 mb-2">Bamboo Forest</h2>
            <p className="font-serif italic text-white/50 mb-8 text-lg">Digital Sanctuary</p>

            <div className="space-y-6 text-white/70 font-sans font-light leading-relaxed text-sm md:text-base">
              <p>
                This experience invites you to wander quietly through a living Japanese bamboo forest—a space of vertical rhythm, filtered light, and gentle life.
              </p>
              <p>
                There is no score, no timer, no objective. Simply drift through the grove, observe the sway of the canopy, and find a moment of stillness.
              </p>
            </div>

            <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between text-xs text-white/30 uppercase tracking-widest gap-4">
              <span>Interactive WebGL Experience</span>
              <span>Three.js • React • Tailwind</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
