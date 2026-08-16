import { supabase } from './supabase'

// TOP TURN 10.1: foundation only. Nothing in this file is imported by
// LineupGame.tsx yet — no automatic submission, no UI. A future turn
// wires submitLineupScore into the game's results flow and builds a
// screen around getTopLineupScores.

export const LINEUP_SCORES_TABLE = 'lineup_scores'
export const LEADERBOARD_TOP_LIMIT = 10

// Deliberately not imported from LineupGame.tsx (NICKNAME_MAX_LENGTH) —
// this module stays isolated from the game component so database access
// never leaks into gameplay code. Keep this in sync with that constant
// by hand if it ever changes; also mirrored in supabase/lineup_scores.sql.
export const LEADERBOARD_NICKNAME_MAX_LENGTH = 12

export const KNOWN_CHARACTER_IDS = [
  'surfer01',
  'surfer02',
  'surfer03',
  'surfer04',
] as const

export type LineupCharacterId = (typeof KNOWN_CHARACTER_IDS)[number]

export interface LineupScore {
  nickname: string
  characterId: LineupCharacterId
  rides: number
  waveReached: number
  createdAt: string
}

export interface LineupScoreInput {
  nickname: string
  characterId: string
  rides: number
  waveReached: number
}

export type LeaderboardResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function isKnownCharacterId(value: string): value is LineupCharacterId {
  return (KNOWN_CHARACTER_IDS as readonly string[]).includes(value)
}

interface ValidatedLineupScoreInput {
  nickname: string
  characterId: LineupCharacterId
  rides: number
  waveReached: number
}

// Enough to reject obviously malformed records before they ever reach
// the network — not a substitute for the CHECK constraints in
// supabase/lineup_scores.sql. Both layers exist because client-submitted
// scores from an unauthenticated browser game can't be trusted; see the
// security-limitation note in the TOP TURN 10.1 report.
export function validateLineupScoreInput(
  input: LineupScoreInput,
): LeaderboardResult<ValidatedLineupScoreInput> {
  const nickname = input.nickname.trim()

  if (nickname.length === 0) {
    return { ok: false, error: 'Nickname cannot be empty.' }
  }
  if (nickname.length > LEADERBOARD_NICKNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Nickname must be ${LEADERBOARD_NICKNAME_MAX_LENGTH} characters or fewer.`,
    }
  }
  if (!isKnownCharacterId(input.characterId)) {
    return { ok: false, error: 'Unknown character.' }
  }
  if (!Number.isInteger(input.rides) || input.rides < 0) {
    return { ok: false, error: 'Rides must be a non-negative integer.' }
  }
  if (!Number.isInteger(input.waveReached) || input.waveReached < 1) {
    return {
      ok: false,
      error: 'Wave reached must be an integer of at least 1.',
    }
  }

  return {
    ok: true,
    data: {
      nickname,
      characterId: input.characterId,
      rides: input.rides,
      waveReached: input.waveReached,
    },
  }
}

interface LineupScoreRow {
  nickname: string
  character_id: string
  rides: number
  wave_reached: number
  created_at: string
}

function rowToScore(row: LineupScoreRow): LineupScore {
  return {
    nickname: row.nickname,
    characterId: row.character_id as LineupCharacterId,
    rides: row.rides,
    waveReached: row.wave_reached,
    createdAt: row.created_at,
  }
}

// Not called from anywhere yet. Validates locally, then inserts one row.
// Network/config failures come back as a clean { ok: false } result —
// never a thrown exception — so a future caller can show "Leaderboard
// unavailable" without the game breaking.
export async function submitLineupScore(
  input: LineupScoreInput,
): Promise<LeaderboardResult<LineupScore>> {
  if (!supabase) {
    return { ok: false, error: 'Leaderboard is not configured.' }
  }

  const validated = validateLineupScoreInput(input)
  if (!validated.ok) {
    return validated
  }

  const { data, error } = await supabase
    .from(LINEUP_SCORES_TABLE)
    .insert({
      nickname: validated.data.nickname,
      character_id: validated.data.characterId,
      rides: validated.data.rides,
      wave_reached: validated.data.waveReached,
    })
    .select('nickname, character_id, rides, wave_reached, created_at')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to submit score.' }
  }

  return { ok: true, data: rowToScore(data as LineupScoreRow) }
}

// Not called from anywhere yet. Fetches only the top N rows (default 10)
// in the agreed ranking order — never the whole table.
export async function getTopLineupScores(
  limit: number = LEADERBOARD_TOP_LIMIT,
): Promise<LeaderboardResult<LineupScore[]>> {
  if (!supabase) {
    return { ok: false, error: 'Leaderboard is not configured.' }
  }

  const { data, error } = await supabase
    .from(LINEUP_SCORES_TABLE)
    .select('nickname, character_id, rides, wave_reached, created_at')
    .order('rides', { ascending: false })
    .order('wave_reached', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: (data as LineupScoreRow[]).map(rowToScore) }
}
