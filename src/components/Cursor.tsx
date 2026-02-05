import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export const Cursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only enable custom cursor on devices with fine pointers (mouse)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    if (!isFinePointer) return

    setIsVisible(true)
    const cursor = cursorRef.current

    // Initial state
    gsap.set(cursor, { xPercent: -50, yPercent: -50 })

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
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

      if (isClickable) {
        gsap.to(cursor, {
          width: 48,
          height: 48,
          backgroundColor: 'white',
          borderWidth: 0,
          duration: 0.3,
          ease: 'back.out(1.7)'
        })
      } else {
        gsap.to(cursor, {
          width: 16,
          height: 16,
          backgroundColor: 'transparent',
          borderWidth: '1px',
          duration: 0.3,
          ease: 'power2.out'
        })
      }
    }

    const onMouseDown = () => {
      gsap.to(cursor, { scale: 0.8, duration: 0.1 })
    }

    const onMouseUp = () => {
      gsap.to(cursor, { scale: 1, duration: 0.1 })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseover', onMouseOver)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseover', onMouseOver)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-4 h-4 rounded-full border border-white pointer-events-none z-[100] mix-blend-difference"
      style={{ willChange: 'transform, width, height, background-color' }}
    />
  )
}
