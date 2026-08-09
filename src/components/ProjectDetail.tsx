import Link from './Link'
import {
  PROJECT_STATUS,
  getProjectBySlug,
  getStatusLabel,
  projects,
} from '../data/projects'

// Renders whichever project matches the current /projects/:slug URL as a
// project-specific hero (wave number, status, title, description, tags,
// and — if the project has one — its visual, large) followed by whichever
// narrative sections that project actually has content for. Empty fields
// stay hidden rather than rendering with invented copy; see `hasStory`.
function ProjectDetail({ slug }: { slug: string }) {
  const project = getProjectBySlug(slug)

  if (!project) {
    return (
      <section className="project-detail">
        <div className="container">
          <Link href="/" className="text-link project-detail__back">
            ← Selected Waves
          </Link>
          <p className="project-detail__missing">This wave hasn't broken yet.</p>
        </div>
      </section>
    )
  }

  const index = projects.findIndex((candidate) => candidate.id === project.id)
  const prevProject = index > 0 ? projects[index - 1] : undefined
  const nextProject =
    index >= 0 && index < projects.length - 1 ? projects[index + 1] : undefined

  const hasStory = Boolean(
    project.overview ||
      project.takeOff ||
      project.theRide ||
      project.topTurns?.length ||
      project.wipeouts?.length ||
      project.lessons?.length ||
      project.techStack?.length,
  )

  return (
    <>
      <section className="project-hero">
        <div className="container">
          <Link href="/" className="text-link project-detail__back">
            ← Selected Waves
          </Link>

          <div className="project-hero__layout">
            <div
              className={`project-hero__visual ${
                project.visualSrc
                  ? `project-hero__visual--${project.visualType ?? 'screenshot'}`
                  : 'project-hero__visual--fallback'
              }`}
            >
              {project.visualSrc ? (
                <img
                  className="project-hero__image"
                  src={project.visualSrc}
                  alt={project.visualAlt || project.title}
                />
              ) : (
                <div className="wave-slide__fallback" aria-hidden="true">
                  <span className="wave-slide__number">
                    {project.waveNumber.slice(-2)}
                  </span>
                  <span className="wave-slide__wave-line" />
                </div>
              )}
            </div>

            <div className="project-hero__meta">
              <div className="project-hero__tag-row">
                <span className="project-row__number">
                  {project.waveNumber}
                </span>
                <span
                  className={`project-row__status project-row__status--${project.status}`}
                  title={PROJECT_STATUS[project.status].description}
                >
                  {getStatusLabel(project)}
                </span>
              </div>
              <h1 className="project-hero__title">{project.title}</h1>
              <p className="project-hero__description">
                {project.shortDescription}
              </p>
              <ul className="project-row__tags project-hero__tags">
                {project.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="project-detail">
        <div className="container">
          {project.overview && (
            <section className="project-detail__section project-detail__section--overview">
              <h2 className="section-heading">Overview</h2>
              <p className="project-detail__section-note">What is this?</p>
              <p>{project.overview}</p>
            </section>
          )}

          {project.takeOff && (
            <section className="project-detail__section project-detail__section--take-off">
              <h2 className="section-heading">Take Off</h2>
              <p className="project-detail__section-note">
                Why I started building it.
              </p>
              <p>{project.takeOff}</p>
            </section>
          )}

          {project.theRide && (
            <section className="project-detail__section">
              <h2 className="section-heading">The Ride</h2>
              <p className="project-detail__section-note">
                How I approached and built it.
              </p>
              <p>{project.theRide}</p>
            </section>
          )}

          {project.topTurns && project.topTurns.length > 0 && (
            <section className="project-detail__section project-detail__section--top-turns">
              <h2 className="section-heading">Top Turns</h2>
              <p className="project-detail__section-note">
                Important iterations and improvements.
              </p>
              <ol className="project-milestones">
                {project.topTurns.map((entry, entryIndex) => (
                  <li key={entryIndex} className="project-milestone">
                    <span className="project-milestone__index">
                      {String(entryIndex + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="project-milestone__title">
                        {entry.title}
                      </p>
                      {entry.note && (
                        <p className="project-milestone__note">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {project.wipeouts && project.wipeouts.length > 0 && (
            <section className="project-detail__section project-detail__section--wipeouts">
              <h2 className="section-heading">Wipeouts</h2>
              <p className="project-detail__section-note">
                Things that failed, surprised me, or taught me something.
              </p>
              <ul className="project-fieldnotes">
                {project.wipeouts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {project.lessons && project.lessons.length > 0 && (
            <section className="project-detail__section">
              <h2 className="section-heading">What I Learned</h2>
              <p className="project-detail__section-note">Key takeaways.</p>
              <ul>
                {project.lessons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {project.techStack && project.techStack.length > 0 && (
            <section className="project-detail__section project-detail__section--built-with">
              <h2 className="section-heading">Built With</h2>
              <ul className="project-detail__meta-list">
                {project.techStack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {(project.externalUrl || project.githubUrl) && (
            <section className="project-detail__section">
              <h2 className="section-heading">Links</h2>
              <ul className="project-detail__links">
                {project.externalUrl && (
                  <li>
                    <a
                      href={project.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View live
                    </a>
                  </li>
                )}
                {project.githubUrl && (
                  <li>
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View code
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}

          {!hasStory && (
            <p className="project-detail__placeholder">
              Log notes for this wave are still being written.
            </p>
          )}

          {(prevProject || nextProject) && (
            <nav className="project-detail__pager" aria-label="Other waves">
              {prevProject ? (
                <Link
                  href={`/projects/${prevProject.slug}`}
                  className="text-link project-detail__pager-link"
                >
                  ← {prevProject.waveNumber} · {prevProject.title}
                </Link>
              ) : (
                <span />
              )}
              {nextProject ? (
                <Link
                  href={`/projects/${nextProject.slug}`}
                  className="text-link project-detail__pager-link project-detail__pager-link--next"
                >
                  {nextProject.waveNumber} · {nextProject.title} →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  )
}

export default ProjectDetail
