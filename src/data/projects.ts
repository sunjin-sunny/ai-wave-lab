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

// Selected Waves carousel card visual. "screenshot" and "artwork" are shown
// full-bleed (object-fit: cover); "pixel-art" is shown uncropped so nothing
// gets sliced off (object-fit: contain, with crisp non-blurred scaling).
// "animated" just means the file is a GIF/WebP — <img> plays those on its
// own, no special handling needed. Video isn't supported yet.
export type ProjectVisualType = 'screenshot' | 'artwork' | 'pixel-art' | 'animated'

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

  // Selected Waves carousel card visual — separate from heroImage above
  // (that's the full-width detail-page banner; this is the small, fixed
  // aspect-ratio area on the card itself, so the two can reasonably be
  // different assets). All optional: WaveSlide falls back to the branded
  // number + wave-line treatment whenever visualSrc is absent.
  visualType?: ProjectVisualType
  visualSrc?: string
  visualAlt?: string

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
    visualType: 'pixel-art',
    visualSrc: '/images/the-lineup-key-visual.png',
    visualAlt:
      'Pixel-art key artwork for The Lineup surfing game: surfers paddling out, waiting their turn, and taking off on a wave, with numbered callouts for the paddle-out, wait-your-turn, take-off, and priority-check gameplay steps.',
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
