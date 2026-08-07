import { useEffect, useRef } from 'react'

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
        <h2 className="section-heading">About</h2>
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
