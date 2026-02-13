import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Zone } from '../types'

export interface TourStep {
  position: [number, number, number]
  target: [number, number, number]
  zone: Zone
  title: string
  description: string
  duration?: number // Optional duration override for transition
}

export const TOUR_STEPS: TourStep[] = [
  {
    position: [0, 4, 15],
    target: [0, 2, 0],
    zone: 'CLEARING',
    title: 'The Clearing',
    description: 'A sanctuary of light where the bamboo parts, revealing the sky above. Here, breath slows and the mind clears.',
    duration: 3
  },
  {
    position: [8, 1.5, 8],
    target: [10, 1.0, 10], // Looking slightly down at the lantern base/mid
    zone: 'GROVE',
    title: 'The Ancient Guardian',
    description: 'A solitary stone lantern, weathered by centuries of rain and moss. It stands as a silent witness to the passing seasons.',
    duration: 4
  },
  {
    position: [-10, 1.5, 3],
    target: [-15, 0.5, 0],
    zone: 'STREAM',
    title: 'Flowing Reflection',
    description: 'Water, the softest element, overcomes the hardest stone. Its gentle murmur is the forest\'s constant song.',
    duration: 4
  },
  {
    position: [-2, 1.2, -2],
    target: [-5, 0.8, -5],
    zone: 'DEEP_FOREST',
    title: 'Life in the Shadows',
    description: 'The forest breathes through its inhabitants. In the deep shade, life thrives in quiet harmony.',
    duration: 3.5
  },
  {
    position: [0, 8, 0],
    target: [0, 20, 0], // Looking straight up
    zone: 'GROVE',
    title: 'Ascent',
    description: 'Reaching for the light, rooted in darkness. The bamboo teaches us to bend without breaking.',
    duration: 4
  }
]

interface TourContextType {
  isActive: boolean
  currentStepIndex: number
  isTransitioning: boolean
  startTour: () => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  setTransitioning: (state: boolean) => void
  currentStep: TourStep
  steps: TourStep[]
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const startTour = () => {
    setIsActive(true)
    setCurrentStepIndex(0)
    setIsTransitioning(true)
  }

  const endTour = () => {
    setIsActive(false)
    setCurrentStepIndex(0)
    setIsTransitioning(false)
  }

  const nextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
      setIsTransitioning(true)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
      setIsTransitioning(true)
    }
  }

  const value = {
    isActive,
    currentStepIndex,
    isTransitioning,
    startTour,
    endTour,
    nextStep,
    prevStep,
    setTransitioning: setIsTransitioning,
    currentStep: TOUR_STEPS[currentStepIndex],
    steps: TOUR_STEPS
  }

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
