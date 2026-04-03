import { useEffect, useState } from 'react'
import { useTour, TOUR_STEPS } from './TourContext'

interface TourOverlayProps {
  isIdle?: boolean
  zenMode?: boolean
}

export function TourOverlay({ isIdle = false, zenMode = false }: TourOverlayProps) {
  const { isActive, currentStep, currentStepIndex, isTransitioning, isAutoPlay, toggleAutoPlay, nextStep, prevStep, startTour, endTour } = useTour()
  const [showContent, setShowContent] = useState(false)

  // Manage content visibility based on transition state
  useEffect(() => {
    if (isTransitioning) {
      setShowContent(false)
    } else {
      // Small delay to allow camera to settle before text appears
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning, currentStepIndex])

  // Auto-play logic
  useEffect(() => {
    if (!isActive || !isAutoPlay || isTransitioning || !showContent) return

    const duration = (currentStep.duration || 4) * 1000 + 4000 // duration + reading time

    const timer = setTimeout(() => {
      nextStep()
    }, duration)

    return () => clearTimeout(timer)
  }, [isActive, isAutoPlay, isTransitioning, showContent, currentStep, nextStep])

  if (!isActive) {
    return (
      <div className={`fixed bottom-8 right-8 z-50 pointer-events-auto transition-opacity duration-1000 ${isIdle || zenMode ? 'opacity-0' : 'opacity-100'}`}>
        <button
          onClick={startTour}
          className="group relative px-5 py-4 rounded-full border border-white/5 flex items-center justify-center animate-pulse bg-black/10 backdrop-blur-3xl hover:bg-white/5 hover:border-white/20 transition-all duration-700 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          data-cursor-text="Begin Journey"
        >
          <div className="flex items-center gap-3">
             <span className="text-[10px] uppercase tracking-widest font-sans text-white/80 group-hover:text-white transition-colors duration-500 whitespace-nowrap">Guided Tour</span>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 group-hover:text-white transition-colors">
               <polygon points="5 3 19 12 5 21 5 3"></polygon>
             </svg>
          </div>
        </button>
      </div>
    )
  }

  // Active Tour UI
  return (
    <div className={`fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-8 md:p-12 transition-opacity duration-1000 ${isIdle || zenMode ? 'opacity-0' : 'opacity-100'}`}>

      {/* Top Bar: Progress & Exit */}
      <div className="flex justify-between items-start w-full pointer-events-auto">
        {/* Progress Indicators */}
        <div className="flex gap-2">
            {TOUR_STEPS.map((_, idx) => (
                <div
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-500 ${
                        idx === currentStepIndex ? 'w-8 bg-white' : 'w-2 bg-white/20'
                    }`}
                />
            ))}
        </div>

        <div className="flex items-center gap-4">
            {/* Auto-Play Toggle */}
            <button
                onClick={toggleAutoPlay}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-3xl border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                    isAutoPlay
                        ? 'bg-white/20 border-white/40 text-white'
                        : 'bg-black/20 border-white/5 text-white/50 hover:text-white/80 hover:bg-black/40 hover:border-white/20'
                }`}
                data-cursor-text={isAutoPlay ? "Pause Auto-Play" : "Start Auto-Play"}
            >
                {isAutoPlay ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                )}
                <span className="text-[10px] uppercase tracking-widest font-sans">
                    {isAutoPlay ? 'Auto' : 'Manual'}
                </span>
            </button>

            {/* Exit Button */}
        <button
            onClick={endTour}
            className="group p-3 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-white/20 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Exit Tour"
            data-cursor-text="Exit"
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50 group-hover:opacity-100 transition-opacity">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
        </button>
        </div>
      </div>

      {/* Center/Bottom: Content Card */}
      {/* Only show if not transitioning (or fading in) */}
      <div className={`flex flex-col items-center justify-end flex-1 pb-12 transition-all duration-1000 ease-out transform ${
          showContent && !isTransitioning
            ? 'opacity-100 translate-y-0 filter-none'
            : 'opacity-0 translate-y-8 blur-sm'
      }`}>
        <div className="relative max-w-lg w-full bg-black/20 backdrop-blur-3xl border border-white/5 p-8 md:p-10 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden">

            {/* Decorative gradient blob */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

            {/* Title */}
            <h2 className="font-serif text-2xl md:text-3xl text-white mb-2 italic tracking-widest">
                {currentStep.title}
            </h2>

            <div className="w-12 h-[1px] bg-white/20 mb-6"></div>

            {/* Description */}
            <p className="font-sans font-light text-white/80 text-sm md:text-base leading-relaxed mb-8">
                {currentStep.description}
            </p>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center w-full pt-6 border-t border-white/5">
                <button
                    onClick={prevStep}
                    disabled={currentStepIndex === 0}
                    className={`text-[10px] uppercase tracking-widest transition-all duration-300 font-thin hover:underline underline-offset-4 decoration-1 decoration-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm ${
                        currentStepIndex === 0 ? 'text-white/10 cursor-not-allowed hover:no-underline' : 'text-white/50 hover:text-white'
                    }`}
                >
                    Previous
                </button>

                <button
                    onClick={nextStep}
                    className="group flex items-center gap-2 transition-all duration-300 font-thin hover:underline underline-offset-4 decoration-1 decoration-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm relative"
                    data-cursor-text={currentStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                >
                    <span className="text-[10px] uppercase tracking-widest text-white/90 group-hover:text-white relative z-10">
                        {currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:translate-x-1 transition-transform relative z-10">
                        <path d="M1 6H11M11 6L7 2M11 6L7 10" stroke="white" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isAutoPlay && (
                        <div className="absolute -bottom-2 left-0 h-[1px] bg-white/40 transition-all duration-100 linear w-full origin-left animate-progress" style={{ animationDuration: `${(currentStep.duration || 4) + 4}s` }}></div>
                    )}
                </button>
            </div>
        </div>
      </div>

      {/* Bottom Spacer to balance layout */}
      <div className="h-12 w-full"></div>
    </div>
  )
}
