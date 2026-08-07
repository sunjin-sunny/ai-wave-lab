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
                <p className="log-list__entry">
                  <span className="log-list__date">{entry.date}</span>
                  <span className="log-list__text">{entry.title}</span>
                </p>
                {entry.description && (
                  <p className="log-list__description">
                    {entry.description}
                  </p>
                )}
                {linkedProject && (
                  <Link
                    href={`/projects/${linkedProject.slug}`}
                    className="log-list__project-link"
                  >
                    → {linkedProject.title}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default Logging
