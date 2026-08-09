import Link from './Link'
import { PROJECT_STATUS, getStatusLabel } from '../data/projects'
import type { Project } from '../data/projects'

// One card in the Selected Waves carousel. Every card is the same size and
// uses the same 01/02/03 number scale — the only thing that varies is
// `active`, driven by whichever slide the carousel is currently centered
// on (see Projects.tsx), not by position in the list.
//
// The whole card is a single <a> rather than a title link stretched over
// it, so the entire surface is clickable/tappable and gets one visible
// focus ring. The accessible name is just the project title (via
// aria-label) — the rest of the card's text is still there for sighted
// readers, just not repeated for screen readers.
//
// .wave-slide__top is a fixed aspect-ratio visual area, the same size on
// every card whether or not a project has real media yet. With no
// project.visualSrc it shows the branded number + wave-line fallback
// (decorative, aria-hidden — it carries no information the surrounding
// text doesn't already give); once a project has an image, that image
// just replaces the fallback in the same slot.
function WaveSlide({
  project,
  index,
  active = false,
}: {
  project: Project
  index: number
  active?: boolean
}) {
  const number = String(index + 1).padStart(2, '0')

  return (
    <Link
      href={`/projects/${project.slug}`}
      aria-label={project.title}
      className={`wave-slide ${active ? 'wave-slide--active' : ''}`}
    >
      <div
        className={`wave-slide__top ${
          project.visualSrc
            ? `wave-slide__top--${project.visualType ?? 'screenshot'}`
            : ''
        }`}
      >
        {project.visualSrc ? (
          <img
            className={`wave-slide__visual ${
              project.visualType === 'pixel-art'
                ? 'wave-slide__visual--pixel-art'
                : ''
            }`}
            src={project.visualSrc}
            alt={project.visualAlt || project.title}
            loading="lazy"
          />
        ) : (
          <div className="wave-slide__fallback" aria-hidden="true">
            <span className="wave-slide__number">{number}</span>
            <span className="wave-slide__wave-line" />
          </div>
        )}
      </div>

      <div className="wave-slide__body">
        <div className="wave-slide__meta">
          <span className="project-row__number">{project.waveNumber}</span>
          <span
            className={`project-row__status project-row__status--${project.status}`}
            title={PROJECT_STATUS[project.status].description}
          >
            {getStatusLabel(project)}
          </span>
        </div>

        <h3 className="wave-slide__title">{project.title}</h3>
        <p className="wave-slide__description">{project.shortDescription}</p>
        <ul className="project-row__tags wave-slide__tags">
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </Link>
  )
}

export default WaveSlide
