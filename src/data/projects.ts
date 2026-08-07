// All project content lives here instead of inside the homepage component.
// To add a new project, add a new object to the `projects` array below —
// nothing in the homepage or routing needs to change.

export type ProjectStatus =
  | 'white-wash'
  | 'take-off'
  | 'green-wave'
  | 'riding'
  | 'lineup'

// The AI Wave Lab status vocabulary. TOP TURN and WIPEOUT are NOT statuses —
// those describe iterations/lessons inside a project's detail page instead.
export const PROJECT_STATUS: Record<
  ProjectStatus,
  { label: string; description: string }
> = {
  'white-wash': { label: 'WHITE WASH', description: 'Early rough experiment' },
  'take-off': { label: 'TAKE OFF', description: 'Actively being built' },
  'green-wave': {
    label: 'GREEN WAVE',
    description: 'Functional project with real potential',
  },
  riding: { label: 'RIDING', description: 'Live and usable' },
  lineup: { label: 'LINEUP', description: 'Idea waiting to be built' },
}

export interface Project {
  id: string
  waveNumber: string
  slug: string
  title: string
  shortDescription: string
  status: ProjectStatus
  /** Overrides the vocabulary label above, if a project ever needs custom status text. */
  statusLabel?: string
  tags: string[]
  year: number
  featured: boolean
  externalUrl?: string
  githubUrl?: string
  heroImage?: string

  // Optional detail-page content. Left blank until a project has a real
  // story to tell — ProjectDetail.tsx only renders sections with content.
  overview?: string
  takeOff?: string
  theRide?: string
  topTurns?: string[]
  wipeouts?: string[]
  lessons?: string[]
  techStack?: string[]
}

export const projects: Project[] = [
  {
    id: 'd2c-journey-explorer',
    waveNumber: 'WAVE 001',
    slug: 'd2c-journey-explorer',
    title: 'D2C Journey Explorer',
    shortDescription:
      'An interactive customer journey experience exploring how digital commerce teams shape the shopping experience.',
    status: 'green-wave',
    tags: ['Interactive', 'AI', 'Prototype'],
    year: 2026,
    featured: true,
  },
  {
    id: 'the-lineup',
    waveNumber: 'WAVE 002',
    slug: 'the-lineup',
    title: 'The Lineup',
    shortDescription:
      'A playful surfing game about timing, wave reading, lineup etiquette, and questionable decisions in the water.',
    status: 'lineup',
    tags: ['Game', 'Surf', 'Learning'],
    year: 2026,
    featured: true,
  },
  {
    id: 'travel-companion',
    waveNumber: 'WAVE 003',
    slug: 'travel-companion',
    title: 'Travel Companion',
    shortDescription:
      'A lightweight AI experiment for turning messy travel ideas into practical plans.',
    status: 'lineup',
    tags: ['AI', 'Travel', 'Prototype'],
    year: 2026,
    featured: true,
  },
]

export function getStatusLabel(project: Project): string {
  return project.statusLabel ?? PROJECT_STATUS[project.status].label
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}
