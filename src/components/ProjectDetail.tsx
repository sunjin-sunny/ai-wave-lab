import Link from './Link'
import {
  PROJECT_STATUS,
  getProjectBySlug,
  getStatusLabel,
  projects,
} from '../data/projects'

function ProjectDetail({ slug }: { slug: string }) {
  const project = getProjectBySlug(slug)

  if (!project) {
    return (
      <section className="project-detail">
        <div className="container">
          <Link href="/" className="text-link project-detail__back">
            ← Selected Waves
          </Link>

          <p className="project-detail__missing">
            This wave hasn't broken yet.
          </p>
        </div>
      </section>
    )
  }

  const index = projects.findIndex(
    (candidate) => candidate.id === project.id,
  )

  const prevProject =
    index > 0 ? projects[index - 1] : undefined

  const nextProject =
    index >= 0 && index < projects.length - 1
      ? projects[index + 1]
      : undefined

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
      {/* ======================================================
          HERO
          ====================================================== */}
      <section className="project-hero">
        <div className="container">
          <Link href="/" className="text-link project-detail__back">
            ← Selected Waves
          </Link>

          <div className="project-hero__layout">

            {/* LEFT */}
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

              <h1 className="project-hero__title">
                {project.title}
              </h1>

              <p className="project-hero__description">
                {project.shortDescription}
              </p>

              <ul className="project-hero__tags">
                {project.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>

              {(project.externalUrl || project.githubUrl || project.playable) && (
                <div className="project-hero__actions">

                  {project.playable && (
                    <Link
                      href={`/projects/${project.slug}/play`}
                      className="project-cta project-cta--primary"
                    >
                      <span>▶</span>
                      Play {project.title}
                    </Link>
                  )}

                  {project.externalUrl && (
                    <a
                      className="project-cta project-cta--primary"
                      href={project.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>↗</span>
                      Experience the Journey
                    </a>
                  )}

                  {project.githubUrl && (
                    <a
                      className="project-cta project-cta--secondary"
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>◉</span>
                      View on GitHub
                    </a>
                  )}

                </div>
              )}

              {project.externalUrl && (
                <p className="project-hero__live-note">
                  ◉ Live on GitHub Pages
                </p>
              )}

            </div>


            {/* RIGHT */}
            <div
              className={`project-hero__visual ${
                project.visualSrc
                  ? `project-hero__visual--${
                      project.visualType ?? 'screenshot'
                    }`
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
                <div
                  className="wave-slide__fallback"
                  aria-hidden="true"
                >
                  <span className="wave-slide__number">
                    {project.waveNumber.slice(-2)}
                  </span>

                  <span className="wave-slide__wave-line" />
                </div>
              )}
            </div>

          </div>
        </div>
      </section>


      {/* ======================================================
          STORY
          ====================================================== */}
      <section className="project-detail">
        <div className="container">

          {project.overview && (
            <section className="project-story-row">
              <div className="project-story-row__label">
                <span className="project-story-row__icon">
                  ◒
                </span>

                <div>
                  <h2 className="section-heading">
                    Overview
                  </h2>

                  <p className="project-detail__section-note">
                    What is this?
                  </p>
                </div>
              </div>

              <div className="project-story-row__content">
                <p>{project.overview}</p>
              </div>
            </section>
          )}


          {project.takeOff && (
            <section className="project-story-row">
              <div className="project-story-row__label">
                <span className="project-story-row__icon">
                  ↗
                </span>

                <div>
                  <h2 className="section-heading">
                    Take Off
                  </h2>

                  <p className="project-detail__section-note">
                    Why I started building it.
                  </p>
                </div>
              </div>

              <div className="project-story-row__content">
                <p>{project.takeOff}</p>
              </div>
            </section>
          )}


          {project.theRide && (
            <section className="project-story-row">
              <div className="project-story-row__label">
                <span className="project-story-row__icon">
                  ≋
                </span>

                <div>
                  <h2 className="section-heading">
                    The Ride
                  </h2>

                  <p className="project-detail__section-note">
                    What the experience brings to life.
                  </p>
                </div>
              </div>

              <div className="project-story-row__content">
                <p>{project.theRide}</p>
              </div>
            </section>
          )}


          {/* ==================================================
              THREE-COLUMN LEARNINGS
              ================================================== */}
          {(project.topTurns?.length ||
            project.wipeouts?.length ||
            project.lessons?.length) && (

            <div className="project-insights-grid">

              {project.topTurns &&
                project.topTurns.length > 0 && (

                  <section className="project-insight">

                    <div className="project-insight__heading">
                      <span className="project-story-row__icon">
                        ↗
                      </span>

                      <div>
                        <h2 className="section-heading">
                          Top Turns
                        </h2>

                        <p className="project-detail__section-note">
                          Key improvements that made it better.
                        </p>
                      </div>
                    </div>


                    <ol className="project-milestones">

                      {project.topTurns.map(
                        (entry, entryIndex) => (

                          <li
                            key={entryIndex}
                            className="project-milestone"
                          >
                            <span className="project-milestone__index">
                              {entryIndex + 1}
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

                        ),
                      )}

                    </ol>
                  </section>
                )}


              {project.wipeouts &&
                project.wipeouts.length > 0 && (

                  <section className="project-insight">

                    <div className="project-insight__heading">
                      <span className="project-story-row__icon">
                        ×
                      </span>

                      <div>
                        <h2 className="section-heading">
                          Wipeouts
                        </h2>

                        <p className="project-detail__section-note">
                          Things that failed, surprised me,
                          or taught me something.
                        </p>
                      </div>
                    </div>


                    <ul className="project-insight__list">

                      {project.wipeouts.map((item) => (
                        <li key={item}>
                          {item}
                        </li>
                      ))}

                    </ul>
                  </section>
                )}


              {project.lessons &&
                project.lessons.length > 0 && (

                  <section className="project-insight">

                    <div className="project-insight__heading">
                      <span className="project-story-row__icon">
                        ◉
                      </span>

                      <div>
                        <h2 className="section-heading">
                          Lessons
                        </h2>

                        <p className="project-detail__section-note">
                          What I’ll carry forward to the next wave.
                        </p>
                      </div>
                    </div>


                    <ul className="project-insight__list">

                      {project.lessons.map((item) => (
                        <li key={item}>
                          {item}
                        </li>
                      ))}

                    </ul>
                  </section>
                )}

            </div>
          )}


          {/* ==================================================
              TECH STACK
              ================================================== */}
          {project.techStack &&
            project.techStack.length > 0 && (

              <section className="project-tech">

                <div className="project-tech__heading">
                  <span className="project-story-row__icon">
                    ≡
                  </span>

                  <div>
                    <h2 className="section-heading">
                      Tech Stack
                    </h2>

                    <p className="project-detail__section-note">
                      What I used to build it.
                    </p>
                  </div>
                </div>


                <ul className="project-tech__list">

                  {project.techStack.map((item) => (
                    <li key={item}>
                      {item}
                    </li>
                  ))}

                </ul>

              </section>
            )}


          {/* ==================================================
              BOTTOM CTA
              ================================================== */}
          {project.externalUrl && (

            <section className="project-bottom-cta">

              <div>
                <h2>
                  Explore the full interactive experience
                </h2>

                <p>
                  Choose a customer, follow the journey,
                  and discover what's working behind each moment.
                </p>
              </div>


              <a
                href={project.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="project-cta project-cta--primary project-bottom-cta__button"
              >
                <span>↗</span>
                Open D2C Journey Explorer
              </a>

            </section>
          )}


          {!hasStory && (
            <p className="project-detail__placeholder">
              Log notes for this wave are still being written.
            </p>
          )}


          {(prevProject || nextProject) && (

            <nav
              className="project-detail__pager"
              aria-label="Other waves"
            >

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