import { LINEUP_CHARACTERS } from '../data/lineupCharacters'

// TOP TURN 11.2: pure wave/scenario/NPC/speed generation, moved out of
// LineupGame.tsx into its own small module rather than a broad
// shared-types file, the same way character data lives in its own file
// (data/lineupCharacters.ts). Nothing here reads component state — every
// export is a plain function of its arguments (or, for the constants, a
// fixed value) — so LineupGame.tsx imports these rather than redefining
// them locally.

// Only three wave directions exist so far — kept as a small local union
// in this module rather than folded into a broader shared-types file.
const WAVE_DIRECTIONS = ['left', 'right', 'dump'] as const
export type WaveDirection = (typeof WAVE_DIRECTIONS)[number]

export function pickWaveDirection(exclude?: WaveDirection): WaveDirection {
  const options = exclude
    ? WAVE_DIRECTIONS.filter((direction) => direction !== exclude)
    : WAVE_DIRECTIONS
  return options[Math.floor(Math.random() * options.length)]
}

// Lineup-etiquette hazards. TOP TURN 06 added priority (a surfer closer
// to the peak); TOP TURN 07 added paddle-out (a surfer paddling back
// through the rideable line). Only one hazard *type* exists per wave — a
// plain union plus a single "which NPC" slot is enough; no need for a
// list or combined-hazard modeling yet. DUMP waves never carry a hazard
// (see pickScenario), so this only ever applies to LEFT/RIGHT waves.
export type LineupScenario = 'clear' | 'priority-surfer' | 'paddle-out-surfer'
const PRIORITY_SCENARIO_CHANCE = 0.25 // 25% of non-dump waves
const PADDLE_OUT_SCENARIO_CHANCE = 0.2 // 20% of non-dump waves
// remainder (55%) is 'clear' — kept implicit rather than its own named
// constant, since it's just "whatever's left"

export function pickScenario(direction: WaveDirection): LineupScenario {
  if (direction === 'dump') return 'clear'
  const roll = Math.random()
  if (roll < PRIORITY_SCENARIO_CHANCE) return 'priority-surfer'
  if (roll < PRIORITY_SCENARIO_CHANCE + PADDLE_OUT_SCENARIO_CHANCE) {
    return 'paddle-out-surfer'
  }
  return 'clear'
}

// TOP TURN 07.1: NPC presence alone no longer means danger — each hazard
// *type* now has a spatial relationship deciding whether it's actually a
// hazard this wave. 'npc-priority'/'blocking' are the true hazards (STOP
// required); 'player-priority'/'clear-line' are safe and fall through to
// completely normal direction+timing judgment in resolveAction. Only
// meaningful when scenario isn't 'clear' — null otherwise.
export type NpcRelationship =
  | 'npc-priority'
  | 'player-priority'
  | 'blocking'
  | 'clear-line'
  | null
const HAZARD_RELATIONSHIP_CHANCE = 0.5 // 50/50 split between the hazardous and safe spatial variant, within whichever scenario was chosen

export function pickRelationship(scenario: LineupScenario): NpcRelationship {
  if (scenario === 'priority-surfer') {
    return Math.random() < HAZARD_RELATIONSHIP_CHANCE
      ? 'npc-priority'
      : 'player-priority'
  }
  if (scenario === 'paddle-out-surfer') {
    return Math.random() < HAZARD_RELATIONSHIP_CHANCE ? 'blocking' : 'clear-line'
  }
  return null
}

// Position class is purely a function of (scenario, relationship,
// waveDirection) — describes the NPC's actual visual side, same
// convention as the wave art's own mirroring: whichever class is used
// for `waveDirection === 'right'` places the NPC exactly where a RIGHT
// wave's spatial rule (see TOP TURN 07.1 spec) says they belong, and the
// LEFT case is its mirror. Kept as a pure function outside the component,
// like pickWaveDirection/pickScenario, since it needs no component state.
export function npcPositionClass(
  scenario: LineupScenario,
  relationship: NpcRelationship,
  direction: WaveDirection,
): string {
  if (scenario === 'priority-surfer') {
    if (relationship === 'npc-priority') {
      return direction === 'right'
        ? 'lineup-stage__npc--peak-left'
        : 'lineup-stage__npc--peak-right'
    }
    return direction === 'right'
      ? 'lineup-stage__npc--shoulder-right'
      : 'lineup-stage__npc--shoulder-left'
  }
  if (scenario === 'paddle-out-surfer') {
    if (relationship === 'blocking') {
      return direction === 'right'
        ? 'lineup-stage__npc--path-right'
        : 'lineup-stage__npc--path-left'
    }
    return direction === 'right'
      ? 'lineup-stage__npc--outpath-left'
      : 'lineup-stage__npc--outpath-right'
  }
  return ''
}

export function pickNpcCharacter(excludePlayerId: string) {
  const options = LINEUP_CHARACTERS.filter((c) => c.id !== excludePlayerId)
  return options[Math.floor(Math.random() * options.length)]
}

// Progressive speed (TOP TURN 07.2; retuned in 07.3 — first to a gentler
// curve after playtesting found the original tiers compressed too fast
// against a fixed RESULT_DISPLAY_MS causing visual overlap [the actual
// fix for that is INTER_WAVE_GAP_MS below, not the curve itself], then to
// this slightly more aggressive curve so the pace increase reads clearly
// by wave 5-8): the incoming-wave animation gets faster as the player
// survives more waves, via a small staircase of named tiers rather than a
// continuous formula — easy to read, easy to retune. 2100ms is an
// explicit floor; the game never gets faster than that in this stage.
export const WAVE_DURATION_TIER_1_MS = 3200 // waves 1-4
const WAVE_DURATION_TIER_2_MS = 2900 // waves 5-8
const WAVE_DURATION_TIER_3_MS = 2600 // waves 9-12
const WAVE_DURATION_TIER_4_MS = 2300 // waves 13-16
const WAVE_DURATION_TIER_5_MS = 2100 // waves 17+ (floor)

export function getWaveDurationMs(waveNumber: number): number {
  if (waveNumber >= 17) return WAVE_DURATION_TIER_5_MS
  if (waveNumber >= 13) return WAVE_DURATION_TIER_4_MS
  if (waveNumber >= 9) return WAVE_DURATION_TIER_3_MS
  if (waveNumber >= 5) return WAVE_DURATION_TIER_2_MS
  return WAVE_DURATION_TIER_1_MS
}

// Takeoff-timing thresholds, expressed as a fraction of however long THIS
// wave's approach takes (getWaveDurationMs) rather than fixed millisecond
// values — so the valid window scales proportionally as the game speeds
// up instead of staying a fixed-ms slice of an ever-shorter animation.
// Chosen to match the original TOP TURN 05 feel at the slowest tier
// (1400/3200 ≈ 0.44, 2400/3200 = 0.75). The wave's own CSS animation
// reads the same duration via a custom property (see .lineup-stage__ocean
// below and .lineup-wave-wrap in App.css) — one source of truth, so the
// visual wave and this judgment can never drift apart.
const TAKEOFF_EARLY_END_RATIO = 0.44 // before this fraction of the wave: TOO EARLY
const TAKEOFF_WINDOW_END_RATIO = 0.75 // EARLY_END..this: valid window; after: TOO LATE

// TOP TURN 11.2A: extracted from resolveAction's inline classification —
// same exact math (elapsedMs is (Date.now() - waveStartRef.current) %
// waveDurationMs, computed by the caller; this function only does the
// ratio comparison), just callable and testable on its own.
export type TakeoffTiming = 'early' | 'good' | 'late'

export function classifyTakeoffTiming(
  elapsedMs: number,
  waveDurationMs: number,
): TakeoffTiming {
  const progress = elapsedMs / waveDurationMs
  return progress < TAKEOFF_EARLY_END_RATIO
    ? 'early'
    : progress < TAKEOFF_WINDOW_END_RATIO
      ? 'good'
      : 'late'
}
