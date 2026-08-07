const projects = [
  {
    number: '01',
    title: 'D2C Journey Explorer',
    description:
      'An interactive customer journey experience exploring how digital commerce teams shape the shopping experience.',
    tags: ['Interactive', 'AI', 'Prototype'],
    status: 'Building',
  },
  {
    number: '02',
    title: 'Surf Forecast Lab',
    description:
      'A future experiment combining surf conditions, weather data, and decision support.',
    tags: ['Data', 'Surf', 'Experiment'],
    status: 'Coming Soon',
  },
  {
    number: '03',
    title: 'Travel Companion',
    description:
      'A lightweight AI experiment for turning messy travel ideas into practical plans.',
    tags: ['AI', 'Travel', 'Prototype'],
    status: 'Coming Soon',
  },
]

function Projects() {
  return (
    <section id="projects" className="projects">
      <div className="container">
        <h2 className="section-heading">Selected Waves</h2>
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.number} className="project-row">
              <span className="project-row__number">{project.number}</span>
              <div className="project-row__body">
                <div className="project-row__head">
                  <h3 className="project-row__title">{project.title}</h3>
                  <span
                    className={`project-row__status ${
                      project.status === 'Building'
                        ? 'project-row__status--building'
                        : ''
                    }`}
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
