// Surf language system (future vocabulary — currently only project status uses this).
// May extend to project detail pages later.
//   WHITE WASH — Early rough experiment.
//   TAKE OFF   — Actively being built.
//   GREEN WAVE — Functional project with real potential.
//   RIDING     — Live and usable.
//   TOP TURN   — Major iteration or improvement.
//   WIPEOUT    — Something that failed or taught an important lesson.
//   LINEUP     — Ideas waiting to be built.
//   LOGGING    — Build notes and reflections.

const projects = [
  {
    number: 'WAVE 001',
    title: 'D2C Journey Explorer',
    description:
      'An interactive customer journey experience exploring how digital commerce teams shape the shopping experience.',
    tags: ['Interactive', 'AI', 'Prototype'],
    status: 'GREEN WAVE · BUILDING',
    kind: 'active',
  },
  {
    number: 'WAVE 002',
    title: 'Surf Forecast Lab',
    description:
      'A future experiment combining surf conditions, weather data, and decision support.',
    tags: ['Data', 'Surf', 'Experiment'],
    status: 'WHITE WASH · EXPERIMENT',
    kind: 'experiment',
  },
  {
    number: 'WAVE 003',
    title: 'Travel Companion',
    description:
      'A lightweight AI experiment for turning messy travel ideas into practical plans.',
    tags: ['AI', 'Travel', 'Prototype'],
    status: 'LINEUP · NEXT',
    kind: 'queued',
  },
]

function Projects() {
  return (
    <section id="projects" className="projects">
      <div className="container">
        <h2 className="section-heading section-heading--offset">
          Selected Waves
        </h2>
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.number} className="project-row">
              <span className="project-row__number">{project.number}</span>
              <div className="project-row__body">
                <div className="project-row__head">
                  <h3 className="project-row__title">{project.title}</h3>
                  <span
                    className={`project-row__status project-row__status--${project.kind}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="project-row__description">
                  {project.description}
                </p>
                <ul className="project-row__tags">
                  {project.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Projects
