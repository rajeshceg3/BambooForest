import { useState, useRef, useEffect, ReactNode } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

// --- Components ---

interface MagneticButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

const MagneticButton = ({ children, onClick, className = '', ariaLabel }: MagneticButtonProps) => {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return

    // Only enable magnetic effect on fine pointers
    if (window.matchMedia('(pointer: coarse)').matches) return

    const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" })
    const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" })

    const onMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect()
      const x = e.clientX - (rect.left + rect.width / 2)
      const y = e.clientY - (rect.top + rect.height / 2)
      xTo(x * 0.3)
      yTo(y * 0.3)
    }

    const onMouseLeave = () => {
      xTo(0)
      yTo(0)
    }

    btn.addEventListener('mousemove', onMouseMove)
    btn.addEventListener('mouseleave', onMouseLeave)

    return () => {
      btn.removeEventListener('mousemove', onMouseMove)
      btn.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative ${className}`}
    >
      {children}
    </button>
  )
}

// --- Main UI ---

interface UIProps {
  audioEnabled: boolean
  onToggleAudio: () => void
}

export const UI = ({ audioEnabled, onToggleAudio }: UIProps) => {
  const [started, setStarted] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { progress, active } = useProgress()
  const titleRef = useRef<HTMLDivElement>(null)

  // Intro Animation on Mount
  useEffect(() => {
    if (progress === 100 && !started && titleRef.current) {
        // Ensure elements are visible before animating
        gsap.set(titleRef.current, { opacity: 1 })

        const chars = titleRef.current.querySelectorAll('.char')
        gsap.fromTo(chars,
            { y: 40, opacity: 0, rotateX: -90 },
            {
              y: 0,
              opacity: 1,
              rotateX: 0,
              stagger: 0.05,
              duration: 1.2,
              ease: "power4.out",
              delay: 0.5
            }
        )
    }
  }, [progress, started])

  // Helper to split text for animation
  const splitText = (text: string) => {
    return text.split('').map((char, i) => (
      <span key={i} className="char inline-block" style={{ opacity: 0 }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ))
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between text-white font-sans select-none overflow-hidden">

      {/* Loader */}
      <div
        className={`absolute inset-0 bg-black z-[60] flex items-center justify-center transition-opacity duration-1000 ease-in-out ${progress === 100 || !active ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex flex-col items-center gap-6">
           <div className="w-32 h-[1px] bg-white/10 overflow-hidden relative">
             <div
               className="absolute inset-y-0 left-0 bg-white transition-all duration-300 ease-out"
               style={{ width: `${progress}%` }}
             />
           </div>
           <p className="font-mono text-[10px] tracking-widest text-white/30 animate-pulse">
            INITIALIZING
          </p>
        </div>
      </div>

      {/* Intro Screen */}
      <div
        className={`absolute inset-0 z-[40] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity duration-1000 ease-in-out ${started ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
      >
        <div className="text-center p-8 max-w-4xl flex flex-col items-center">
          <div ref={titleRef} className="opacity-0 mb-8 overflow-hidden perspective-[1000px]">
             <h1 className="font-serif text-6xl md:text-9xl tracking-tighter text-white/90 leading-none mix-blend-overlay">
               {splitText("BAMBOO FOREST")}
             </h1>
          </div>

          <p className={`font-serif italic text-white/60 text-lg md:text-2xl mb-12 tracking-wide font-light transition-all duration-1000 delay-1000 ${progress === 100 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            A digital sanctuary.
          </p>

          <button
            onClick={() => setStarted(true)}
            className={`group relative px-8 py-4 overflow-hidden transition-all duration-1000 delay-[1200ms] ${progress === 100 ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className="relative z-10 font-sans text-xs md:text-sm tracking-[0.4em] uppercase text-white/80 group-hover:text-white transition-colors duration-500">
              Enter
            </span>
            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/30 transform scale-x-50 group-hover:scale-x-100 transition-transform duration-700 ease-out"></span>
          </button>
        </div>
      </div>

      {/* HUD - Visible only when started */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 delay-500 ${started ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Vignette Gradients for Text Legibility */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Top Left: Title (Subtle) */}
        <div className="absolute top-6 left-6 md:top-8 md:left-8 opacity-60 hover:opacity-100 transition-opacity duration-500 pointer-events-auto">
           <span className="font-serif text-xs md:text-sm tracking-widest uppercase text-white drop-shadow-sm">
             Bamboo Forest
           </span>
        </div>

        {/* Bottom Center: Controls Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-50 text-white/70 font-sans text-xs tracking-widest uppercase md:bottom-10">
          Use Arrow Keys or Drag to Explore
        </div>

        {/* Bottom Left: Audio Toggle */}
        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 pointer-events-auto">
          <MagneticButton
            onClick={onToggleAudio}
            ariaLabel={audioEnabled ? "Mute" : "Unmute"}
            className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all duration-300 group"
          >
            {audioEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 group-hover:text-white transition-colors">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 group-hover:text-white transition-colors">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </MagneticButton>
        </div>

        {/* Bottom Right: Info Button */}
        <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 pointer-events-auto">
          <MagneticButton
            onClick={() => setAboutOpen(true)}
            ariaLabel="About"
            className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all duration-300 group"
          >
            <span className="font-serif italic text-xl md:text-2xl text-white/70 group-hover:text-white transition-colors">i</span>
          </MagneticButton>
        </div>
      </div>

      {/* About Modal */}
      <div
        className={`absolute inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-700 ${aboutOpen ? 'opacity-100 pointer-events-auto backdrop-blur-xl bg-black/40' : 'opacity-0 pointer-events-none backdrop-blur-none bg-black/0'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAboutOpen(false)
        }}
      >
        <div
            className={`max-w-xl w-full bg-neutral-900/80 border border-white/10 p-8 md:p-12 shadow-2xl relative overflow-hidden transition-all duration-700 transform ${aboutOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'}`}
        >
          {/* Close Button */}
          <button
            onClick={() => setAboutOpen(false)}
            className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors p-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="font-serif text-3xl md:text-4xl text-white tracking-tight">Bamboo Forest</h2>
                <div className="h-[1px] w-12 bg-white/50"></div>
                <p className="font-serif italic text-white/50 text-lg">Digital Sanctuary</p>
            </div>

            <div className="space-y-6 text-white/70 font-sans font-light leading-relaxed text-sm md:text-base tracking-wide">
              <p>
                Wander through a procedural grove where light, wind, and sound conspire to create a moment of stillness.
              </p>
              <p>
                There is no objective. Observe the sway. Listen to the wind.
              </p>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between text-[10px] text-white/30 uppercase tracking-[0.2em] gap-4 font-mono">
              <span>WebGL • React Three Fiber</span>
              <span>2024</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
