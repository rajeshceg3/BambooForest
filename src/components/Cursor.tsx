import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export const Cursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only enable custom cursor on devices with fine pointers (mouse)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    if (!isFinePointer) return

    setIsVisible(true)

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursorRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      })
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if the target or its parent is clickable
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button'

      setIsHovering(!!isClickable)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseover', onMouseOver)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseover', onMouseOver)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      ref={cursorRef}
      className={`fixed top-0 left-0 w-4 h-4 rounded-full border border-white pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2 mix-blend-difference transition-transform duration-300 ease-out ${
        isHovering ? 'scale-[2.5] bg-white' : 'scale-100 bg-transparent'
      }`}
      style={{ willChange: 'transform' }}
    />
  )
}
