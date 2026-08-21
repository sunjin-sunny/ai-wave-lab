// All project content lives here instead of inside the homepage component.
// To add a new project, add a new object to the `projects` array below —
// nothing in the homepage or routing needs to change.
const BASE = import.meta.env.BASE_URL

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

// A single Top Turn (iteration/improvement) gets its own short title plus an
// optional elaboration — unlike Wipeouts/Lessons, which read fine as flat
// one-line notes, an iteration usually needs a name before the detail makes
// sense ("Redesigned onboarding" then, optionally, why/what changed).
export interface ProjectMilestone {
  title: string
  note?: string
}

// Prepared for a future secondary-visuals gallery — not rendered anywhere
// yet (see ProjectDetail.tsx). Kept as a plain optional field rather than
// building any UI for it now.
export interface ProjectScreenshot {
  src: string
  alt: string
  caption?: string
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
  /** Whether this project has a playable page at /projects/:slug/play. */
  playable?: boolean
  /**
   * TOP TURN 12.4: when set, the Play CTA opens this URL instead of the
   * internal /projects/:slug/play route — used once a game has moved to
   * its own standalone deployment. `playable` stays true alongside this
   * (see LineupGame.tsx's own guard, and the CTA's visibility condition
   * in ProjectDetail.tsx), so the internal route keeps working as a
   * fallback if visited directly; only the CTA's target changes.
   */
  playUrl?: string

  // The project's visual identity, used both as the small Selected Waves
  // carousel card image AND the large project-detail hero visual. All
  // optional: both places fall back to the branded number + wave-line
  // treatment whenever visualSrc is absent.
  visualType?: ProjectVisualType
  visualSrc?: string
  visualAlt?: string

  // Optional detail-page content. Left blank until a project has a real
  // story to tell — ProjectDetail.tsx only renders sections with content.
  overview?: string
  takeOff?: string
  theRide?: string
  topTurns?: ProjectMilestone[]
  wipeouts?: string[]
  lessons?: string[]
  techStack?: string[]
  screenshots?: ProjectScreenshot[]
}

export const projects: Project[] = [
  {
  id: 'd2c-journey-explorer',
  waveNumber: 'WAVE 001',
  slug: 'd2c-journey-explorer',
  title: 'D2C Journey Explorer',

  shortDescription:
    "Every purchase has a journey. Follow three customers across three markets and discover what's working behind each moment.",

  status: 'riding',

  tags: [
    'D2C',
    'Interactive',
    'AI',
    'Vibe Coding',
  ],

  year: 2026,
  featured: true,

  visualType: 'artwork',
visualSrc: `${BASE}images/D2C-journey-key-visual.png`,
visualAlt:
  'Pixel-art key visual for D2C Journey Explorer, following three customers through different digital commerce journeys.',

  externalUrl:
    'https://sunjin-sunny.github.io/d2c-journey-explorer/',

  githubUrl:
    'https://github.com/sunjin-sunny/d2c-journey-explorer',

  overview:
    'A global D2C customer journey turned into an interactive experience. Choose a customer, follow their purchase journey, and tap each glowing pointer to discover the product, UX, engineering, marketing, and commercial capabilities working behind the screen.',

  takeOff:
    "It started with a simple question: how do you explain a complex D2C ecosystem without showing people another org chart? I replaced the organization chart with three fictional customers — Alex, Matthew, and Vanessa — each navigating a different market, product category, and purchase context.",

  theRide:
    'Alex shops for a Galaxy device in the United States. Matthew uses an AI Shopping Assistant to choose a TV in the United Kingdom. Vanessa buys an air conditioner in Mexico. Across their journeys, each customer moment becomes a window into the decisions, systems, and cross-functional work behind a digital commerce experience.',

  topTurns: [
    {
      title: 'Turned an org chart into a customer journey',
      note:
        'Instead of explaining teams directly, the experience reveals capabilities only when they become relevant to a customer moment.',
    },
    {
      title: 'Built persona-driven storytelling',
      note:
        'Three pixel-art customers give each market and product category a distinct context while keeping the interaction lightweight and playful.',
    },
    {
      title: 'Added interactive journey annotations',
      note:
        'One glowing pointer per key screen exposes the product, UX, technology, marketing, or commercial capability behind what the customer sees.',
    },
    {
      title: 'Added English / Korean localization',
      note:
        'The interface, journey annotations, ending, and project story can switch between English and Korean without duplicating the underlying journey structure.',
    },
    {
      title: 'Shipped a responsive live experience',
      note:
        'The prototype was refined across desktop and mobile, then deployed publicly through GitHub Pages.',
    },
  ],

  wipeouts: [
    'The first version tried to explain too much. More screens and more organizational detail made the experience harder — not easier — to understand.',
    'A few seemingly small UI changes broke card rendering, overlays, and responsive behavior. Repeated browser QA became part of the build process.',
    'Mobile overlays exposed z-index and fixed-position conflicts that were almost invisible on desktop.',
    'Some generated persona assets looked transparent but actually contained baked-in backgrounds, which had to be cleaned up before use.',
  ],

  lessons: [
    'AI dramatically lowered the barrier to building, but product judgment still determined what to show, what to remove, and what the user should understand next.',
    'One customer moment paired with one clear insight was stronger than trying to explain every team and capability at once.',
    'A working prototype creates much better product conversations than a static explanation of the same concept.',
    'Vibe coding works best when the PM can continuously test, critique, simplify, and redirect the implementation rather than treating generated code as finished output.',
  ],

  techStack: [
    'HTML',
    'CSS',
    'JavaScript',
    'Generative AI',
    'Vibe Coding',
    'GitHub Pages',
  ],
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
    playable: true,
    playUrl: 'https://sunjin-sunny.github.io/the-lineup/',
    visualType: 'pixel-art',
    visualSrc: `${BASE}images/the-lineup-key-visual.png`,
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
