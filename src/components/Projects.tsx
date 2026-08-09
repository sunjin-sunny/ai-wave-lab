import { useEffect, useRef, useState } from 'react'
import Link from './Link'
import WaveSlide from './WaveSlide'
import { projects } from '../data/projects'

// "Selected Waves" is a curated homepage slice, not a full list — even
// once many more projects are marked featured, only the first few show
// here as slides. The rest lives behind "Explore all waves" at /projects.
const FEATURED_LIMIT = 3
const featuredProjects = projects
  .filter((project) => project.featured)
  .slice(0, FEATURED_LIMIT)

function Projects() {
  const trackRef = useRef<HTMLUListElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Tracks which slide is "active" (closest to the track's start-aligned
  // scroll position) as the visitor scrolls/swipes, so the "02 / 03" index
  // and the arrow buttons' disabled state stay in sync with native scroll.
  //
  // This is scroll-position math rather than IntersectionObserver ratios
  // on purpose: the last slide has little trailing space to peek into (by
  // design), so it can never reach as high a visible-area ratio as the
  // slide before it — a ratio-based "most visible" comparison gets stuck
  // one slide behind at the end of the track. Comparing each slide's start
  // position to the current scroll offset doesn't have that problem.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const slides = Array.from(track.children) as HTMLElement[]
    let frame = 0

    const update = () => {
      const inset = parseFloat(getComputedStyle(track).paddingLeft) || 0
      const target = track.scrollLeft + inset
      let bestIndex = 0
      let bestDistance = Infinity
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - target)
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
        }
      })
      setActiveIndex(bestIndex)
      frame = 0
    }

    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    track.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', handleScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const scrollToIndex = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(index, featuredProjects.length - 1))
    const slide = track.children[clamped] as HTMLElement | undefined
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    slide?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    })
  }

  return (
    <section id="projects" className="waves" aria-label="Selected Waves">
      <div className="container waves__head">
        <h2 className="section-heading section-heading--offset">
          Selected Waves
        </h2>
        <div className="waves__nav">
          <span className="waves__index" aria-hidden="true">
            {String(activeIndex + 1).padStart(2, '0')} /{' '}
            {String(featuredProjects.length).padStart(2, '0')}
          </span>
          <div className="waves__controls">
            <button
              type="button"
              className="waves__control"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous wave"
            >
              ←
            </button>
            <button
              type="button"
              className="waves__control"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex === featuredProjects.length - 1}
              aria-label="Next wave"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <ul className="waves__track" ref={trackRef}>
        {featuredProjects.map((project, index) => (
          <li key={project.id} className="waves__slide-wrap">
            <WaveSlide
              project={project}
              index={index}
              active={index === activeIndex}
            />
          </li>
        ))}
      </ul>

      <div className="container">
        <Link
          href="/projects"
          className="text-link projects__archive-link"
        >
          Explore all waves →
        </Link>
      </div>
    </section>
  )
}

export default Projects
