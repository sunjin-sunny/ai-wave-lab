/// <reference types="vite/client" />

interface ImportMetaEnv {
  // TOP TURN 10.1: Supabase leaderboard credentials. Optional because the
  // rest of the site (and The Lineup itself) must keep working even when
  // the leaderboard hasn't been configured yet — see src/lib/supabase.ts.
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
