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

        <div className="about__header">
          <div>
            <h2 className="section-heading">About Sunny</h2>
            <p className="about__header-note">
              Two sides of the same PM.
            </p>
          </div>
        </div>

        <div className="about__main">

          <div className="about__copy">
            <p className="about__greeting">
              Good day, mates!
              <br />
              I'm Sunny — a PM who's
            </p>

            <div className="about__traits">
              <p className="about__trait">
                <strong>Curious</strong>
                <span> enough to explore new AI worlds.</span>
              </p>

              <p className="about__trait">
                <strong>Brave</strong>
                <span> enough to paddle into curling waves.</span>
              </p>

              <p className="about__trait">
                <strong>Kind</strong>
                <span> enough to leave you with a good word.</span>
              </p>

              <p className="about__trait">
                <strong>Generous</strong>
                <span>
                  {' '}enough to drink just about anything — until the whole
                  world starts to whirl.
                </span>
                <span className="about__whirl-dot" aria-hidden="true" />
              </p>
            </div>
          </div>

          <div className="about__characters">

            <figure className="about__character-card">
              <div className="about__character-frame">
                <img
                  className="about__character"
                  src="/images/sunny-pm.png"
                  alt="Pixel-art Sunny as a Product Manager holding a laptop"
                  loading="lazy"
                />
              </div>
              <figcaption>Sunny / PM</figcaption>
            </figure>

            <figure className="about__character-card">
              <div className="about__character-frame">
                <img
                  className="about__character"
                  src="/images/sunny-surf.png"
                  alt="Pixel-art Sunny holding a surfboard"
                  loading="lazy"
                />
              </div>
              <figcaption>Sunny / Surf</figcaption>
            </figure>

          </div>
        </div>

        <div className="about__philosophy">

          <div>
            <p
              ref={emphasisRef}
              className="about__emphasis"
            >
              Surfing taught me that every wave is different.
            </p>

            <p className="about__philosophy-sub">
              Building products feels the same.
            </p>
          </div>

          <p className="about__closing">
            You don't control everything. You learn to read the conditions,
            commit, and ride what comes next.
          </p>

        </div>

        <div className="about__socials">

          <a
            href="https://www.instagram.com/sunny.xuxxix"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="about__social-link"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" className="social-dot" />
            </svg>
          </a>

          <a
            href="https://www.linkedin.com/in/sunnylee13"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="about__social-link"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 10v7" />
              <path d="M8 7.5v.1" />
              <path d="M12 17v-4c0-2 1.2-3 2.8-3 1.8 0 3.2 1.2 3.2 3.5V17" />
              <path d="M12 10v7" />
            </svg>
          </a>

          <a
            href="https://github.com/sunjin-sunny"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="about__social-link"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3a9 9 0 0 0-2.85 17.54c.45.08.62-.2.62-.44v-1.73c-2.52.55-3.05-1.07-3.05-1.07-.41-1.05-1-1.33-1-1.33-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.81 1.38 2.12.98 2.64.75.08-.58.31-.98.57-1.21-2.01-.23-4.12-1-4.12-4.48 0-.99.35-1.8.93-2.43-.09-.23-.4-1.15.09-2.4 0 0 .76-.24 2.48.93a8.6 8.6 0 0 1 4.52 0c1.72-1.17 2.48-.93 2.48-.93.49 1.25.18 2.17.09 2.4.58.63.93 1.44.93 2.43 0 3.49-2.12 4.25-4.14 4.47.33.28.61.83.61 1.67v2.55c0 .24.17.52.62.43A9 9 0 0 0 12 3Z" />
            </svg>
          </a>

        </div>

      </div>
    </section>
  )
}

export default About