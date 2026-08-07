import Link from './Link'
import { logEntries } from '../data/logs'
import { getProjectBySlug } from '../data/projects'

function Logging() {
  return (
    <section id="logbook" className="logbook">
      <div className="container">
        <h2 className="section-heading">Logging</h2>
        <p className="section-subtitle">Notes from the ride.</p>
        <ul className="log-list">
          {logEntries.map((entry, index) => {
            const linkedProject = entry.projectSlug
              ? getProjectBySlug(entry.projectSlug)
              : undefined

            return (
              <li
                key={index}
                className={`log-list__row ${
                  entry.date === 'Next' ? 'log-list__row--next' : ''
                }`}
              >
                <span className="log-list__date">{entry.date}</span>
                <span className="log-list__body">
                  <span className="log-list__text">{entry.title}</span>
                  {entry.description && (
                    <span className="log-list__description">
                      {entry.description}
                    </span>
                  )}
                  {linkedProject && (
                    <Link
                      href={`/projects/${linkedProject.slug}`}
                      className="log-list__project-link"
                    >
                      → {linkedProject.title}
                    </Link>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default Logging
