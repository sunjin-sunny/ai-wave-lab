import Link from './Link'
import { PROJECT_STATUS, getStatusLabel, projects } from '../data/projects'

const featuredProjects = projects.filter((project) => project.featured)

function Projects() {
  return (
    <section id="projects" className="projects">
      <div className="container">
        <h2 className="section-heading section-heading--offset">
          Selected Waves
        </h2>
        <ul className="project-list">
          {featuredProjects.map((project) => (
            <li key={project.id} className="project-row">
              <span className="project-row__number">{project.waveNumber}</span>
              <div className="project-row__body">
                <h3 className="project-row__title">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="project-row__title-link"
                  >
                    {project.title}
                  </Link>
                </h3>
                <p className="project-row__description">
                  {project.shortDescription}
                </p>
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Projects
