import Link from './Link'
import { logEntries } from '../data/logs'
import { getProjectBySlug } from '../data/projects'

function Logging() {
  return (
    <section id="logbook" className="logging" aria-label="Lab notes">
      <div className="container">
        <div className="logging__header">
          <div>
            <h2 className="section-heading">Logging</h2>
            <p className="logging__intro">
              Small notes from the lab.
            </p>
          </div>
        </div>

        <ol className="logging__list">
          {logEntries.map((entry, index) => {
            const linkedProject = entry.projectSlug
              ? getProjectBySlug(entry.projectSlug)
              : undefined

            return (
              <li
                key={index}
                className={`logging__entry ${
                  entry.date === 'Next' ? 'logging__entry--next' : ''
                }`}
              >
                <div className="logging__meta">
                  <span className="logging__id">
                    LOG / {String(index + 1).padStart(3, '0')}
                  </span>

                  <span className="logging__date">
                    {entry.date}
                  </span>
                </div>

                <div className="logging__content">
                  <p className="logging__text">
                    {entry.title}
                  </p>

                  {entry.description && (
                    <p className="logging__description">
                      {entry.description}
                    </p>
                  )}

                  {linkedProject && (
                    <Link
                      href={`/projects/${linkedProject.slug}`}
                      className="logging__link"
                    >
                      Explore {linkedProject.title} →
                    </Link>
                  )}
                </div>

                <span className="logging__arrow" aria-hidden="true">
                  →
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export default Logging