import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export const Cursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [cursorText, setCursorText] = useState('')

  useEffect(() => {
    // Only enable custom cursor on devices with fine pointers (mouse)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    if (isFinePointer) {
        setIsVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const cursor = cursorRef.current
    const textSpan = textRef.current

    if (!cursor) return

    // Initial state
    gsap.set(cursor, { xPercent: -50, yPercent: -50 })

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.6,
        ease: 'elastic.out(1, 0.75)'
      })
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check for data-cursor-text
      const text = target.getAttribute('data-cursor-text') || target.closest('[data-cursor-text]')?.getAttribute('data-cursor-text')
      setCursorText(text || '')

      // Check if the target or its parent is clickable
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button' ||
        !!text

      if (isClickable) {
        gsap.to(cursor, {
            width: text ? 80 : 48,
            height: text ? 80 : 48,
            backgroundColor: 'white',
            borderWidth: 0,
            duration: 0.3,
            ease: 'back.out(1.7)'
        })

        if (textSpan) {
            gsap.to(textSpan, { opacity: 1, scale: 1, duration: 0.2 })
        }
      } else {
        gsap.to(cursor, {
            width: 16,
            height: 16,
            backgroundColor: 'transparent',
            borderWidth: '1px',
            duration: 0.3,
            ease: 'power2.out'
        })

        if (textSpan) {
            gsap.to(textSpan, { opacity: 0, scale: 0.5, duration: 0.2 })
        }
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
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 flex items-center justify-center rounded-full border border-white pointer-events-none z-[100] mix-blend-difference overflow-hidden"
      style={{ willChange: 'transform, width, height, background-color', width: '16px', height: '16px' }}
    >
        <span
            ref={textRef}
            className="text-black text-[10px] font-bold uppercase tracking-widest opacity-0 scale-50"
        >
            {cursorText}
        </span>
    </div>
  )
}
