import Link from './Link'
import { PROJECT_STATUS, getProjectBySlug, getStatusLabel } from '../data/projects'

// Renders whichever project matches the current /projects/:slug URL.
// Detail sections (Overview, Take Off, ...) only appear once a project
// actually has that content — see `hasStory` below for the fallback.
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
    <section className="project-detail">
      <div className="container">
        <Link href="/" className="text-link project-detail__back">
          ← Selected Waves
        </Link>

        <div className="project-detail__header">
          <span className="project-row__number">{project.waveNumber}</span>
          <h1 className="project-detail__title">{project.title}</h1>
          <div className="project-detail__meta">
            <span
              className={`project-row__status project-row__status--${project.status}`}
              title={PROJECT_STATUS[project.status].description}
            >
              {getStatusLabel(project)}
            </span>
            <ul className="project-row__tags">
              {project.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
          <p className="project-detail__description">
            {project.shortDescription}
          </p>
        </div>

        {project.heroImage && (
          <img
            className="project-detail__hero-image"
            src={project.heroImage}
            alt=""
          />
        )}

        {project.overview && (
          <section className="project-detail__section">
            <h2 className="section-heading">Overview</h2>
            <p className="project-detail__section-note">What is this?</p>
            <p>{project.overview}</p>
          </section>
        )}

        {project.takeOff && (
          <section className="project-detail__section">
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
          <section className="project-detail__section">
            <h2 className="section-heading">Top Turns</h2>
            <p className="project-detail__section-note">
              Important iterations and improvements.
            </p>
            <ul>
              {project.topTurns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {project.wipeouts && project.wipeouts.length > 0 && (
          <section className="project-detail__section">
            <h2 className="section-heading">Wipeouts</h2>
            <p className="project-detail__section-note">
              Things that failed, surprised me, or taught me something.
            </p>
            <ul>
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
          <section className="project-detail__section">
            <h2 className="section-heading">Built With</h2>
            <p className="project-detail__section-note">
              Technology and tools.
            </p>
            <ul>
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
                  <a href={project.externalUrl} target="_blank" rel="noreferrer">
                    View live
                  </a>
                </li>
              )}
              {project.githubUrl && (
                <li>
                  <a href={project.githubUrl} target="_blank" rel="noreferrer">
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
      </div>
    </section>
  )
}

export default ProjectDetail
