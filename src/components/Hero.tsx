import { useEffect, useRef } from 'react'

function Hero() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const canHover = window.matchMedia('(pointer: fine)').matches
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!canHover || reduceMotion) return

    let frame = 0
    let latestX = 0.5

    const applyShift = () => {
      const normalized = Math.min(1, Math.max(-1, (latestX - 0.5) * 2))
      hero.style.setProperty('--pointer-shift', normalized.toFixed(3))
      frame = 0
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect()
      latestX = (event.clientX - rect.left) / rect.width
      if (!frame) frame = requestAnimationFrame(applyShift)
    }

    const handlePointerLeave = () => {
      latestX = 0.5
      if (!frame) frame = requestAnimationFrame(applyShift)
    }

    hero.addEventListener('pointermove', handlePointerMove)
    hero.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove)
      hero.removeEventListener('pointerleave', handlePointerLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="container hero__content">
        <h1 className="hero__headline">
          Ride the
          <br />
          Next Wave.
        </h1>
        <div className="hero__meta">
          <p className="hero__lede">
            Ideas, experiments,
            <br />
            and products built with AI.
          </p>
          <p className="hero__intro">
            A Product Manager exploring what happens
            <br />
            when curiosity meets AI.
          </p>
        </div>
      </div>
      <div className="wave-visual" aria-hidden="true">
        <div className="wave-layer wave-layer--back" />
        <div className="wave-layer wave-layer--mid" />
        <div className="wave-layer wave-layer--front" />
        <div className="wave-layer wave-layer--shine" />
      </div>
    </section>
  )
}

export default Hero
