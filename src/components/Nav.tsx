import { useEffect, useRef, useState } from 'react'
import Link from './Link'

// On mobile the nav tucks away while scrolling down (so it stops reading
// as a fixed document frame) and returns the moment the visitor scrolls
// back up, even slightly — it should always be trivial to recover. This
// only has a visual effect on mobile widths; see .site-nav--hidden in
// App.css. Desktop nav is untouched.
function Nav() {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    let frame = 0

    const update = () => {
      const currentY = window.scrollY
      const goingDown = currentY > lastY.current
      setHidden(goingDown && currentY > 120)
      lastY.current = currentY
      frame = 0
    }

    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header className={`site-nav ${hidden ? 'site-nav--hidden' : ''}`}>
      <div className="container site-nav__inner">
        <Link className="brand" href="/">
          <span className="brand__name">AI WAVE LAB</span>
          <span className="brand__by">by Sunny</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="nav-links">
            <li>
              <a href="#projects">Projects</a>
            </li>
            <li>
              <a href="#logbook">Logging</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Nav
