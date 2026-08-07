import { useEffect, useRef } from 'react'

// Copy stays as-is for now, but `.about__body` is just a plain flex column
// of <p> tags — later, a fuller intro, PM background, why-AI story, an
// image/pixel-art element, or external links can each be added as one more
// child here (or a sibling block next to it) without restructuring anything.
function About() {
  const emphasisRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = emphasisRef.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-heading visually-hidden">About</h2>
        <div className="about__body">
          <p>Hi, I'm Sunny.</p>
          <p>By day, I work as a Product Manager.</p>
          <p>
            Outside work, I enjoy turning random ideas
            <br />
            into things people can actually click.
          </p>
          <p ref={emphasisRef} className="about__emphasis">
            Surfing taught me that every wave is different.
          </p>
          <p>Building products feels the same.</p>
          <p className="about__closing">
            You don't control everything.
            <br />
            You learn to read the conditions,
            <br />
            commit, and ride what comes next.
          </p>
        </div>
      </div>
    </section>
  )
}

export default About
