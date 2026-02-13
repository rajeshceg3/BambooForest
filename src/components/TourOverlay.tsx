import { useEffect, useState } from 'react'
import { useTour, TOUR_STEPS } from './TourContext'

export function TourOverlay() {
  const { isActive, currentStep, currentStepIndex, isTransitioning, nextStep, prevStep, startTour, endTour } = useTour()
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

  if (!isActive) {
    return (
      <div className="fixed bottom-8 right-8 z-50 pointer-events-auto">
        <button
          onClick={startTour}
          className="group relative px-6 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full transition-all duration-500 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:scale-105"
          data-cursor-text="Begin Journey"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-white/50 group-hover:bg-white transition-colors duration-500 animate-pulse"></span>
            <span className="text-white/80 group-hover:text-white text-xs tracking-[0.2em] uppercase font-light">
              Guided Tour
            </span>
          </div>
        </button>
      </div>
    )
  }

  // Active Tour UI
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-8 md:p-12">

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

        {/* Exit Button */}
        <button
            onClick={endTour}
            className="group p-3 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur border border-white/5 hover:border-white/20 transition-all duration-300"
            aria-label="Exit Tour"
            data-cursor-text="Exit"
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50 group-hover:opacity-100 transition-opacity">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
        </button>
      </div>

      {/* Center/Bottom: Content Card */}
      {/* Only show if not transitioning (or fading in) */}
      <div className={`flex flex-col items-center justify-end flex-1 pb-12 transition-all duration-1000 ease-out transform ${
          showContent && !isTransitioning
            ? 'opacity-100 translate-y-0 filter-none'
            : 'opacity-0 translate-y-8 blur-sm'
      }`}>
        <div className="relative max-w-lg w-full bg-black/40 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">

            {/* Decorative gradient blob */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

            {/* Title */}
            <h2 className="font-serif text-2xl md:text-3xl text-white mb-2 italic tracking-wide">
                {currentStep.title}
            </h2>

            <div className="w-12 h-[1px] bg-white/20 mb-6"></div>

            {/* Description */}
            <p className="font-sans font-light text-white/80 text-sm md:text-base leading-relaxed mb-8">
                {currentStep.description}
            </p>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center w-full pt-4 border-t border-white/5">
                <button
                    onClick={prevStep}
                    disabled={currentStepIndex === 0}
                    className={`text-[10px] uppercase tracking-widest transition-colors ${
                        currentStepIndex === 0 ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:text-white'
                    }`}
                >
                    Previous
                </button>

                <button
                    onClick={nextStep}
                    className="group flex items-center gap-3 px-5 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300"
                    data-cursor-text={currentStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                >
                    <span className="text-[10px] uppercase tracking-widest text-white font-medium">
                        {currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:translate-x-1 transition-transform">
                        <path d="M1 6H11M11 6L7 2M11 6L7 10" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
      </div>

      {/* Bottom Spacer to balance layout */}
      <div className="h-12 w-full"></div>
    </div>
  )
}
