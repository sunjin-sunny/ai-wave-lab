// Logbook entries, ready to grow into real build notes over time.
// `projectSlug` optionally links an entry to a project in projects.ts.

export interface LogEntry {
  date: string
  title: string
  description?: string
  projectSlug?: string
  type?: 'build' | 'note' | 'milestone'
}

export const logEntries: LogEntry[] = [
  { date: 'Aug 2026', title: 'Started AI Wave Lab.' },
  {
    date: 'Aug 2026',
    title: 'Built my first interactive D2C prototype with AI.',
    projectSlug: 'd2c-journey-explorer',
  },
  { date: 'Next', title: 'Ship something people can actually use.' },
]
