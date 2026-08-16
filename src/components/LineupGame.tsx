import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from './Link'
import { getProjectBySlug } from '../data/projects'
import { LINEUP_CHARACTERS } from '../data/lineupCharacters'
import type { LineupCharacterSprites } from '../data/lineupCharacters'

const NICKNAME_MAX_LENGTH = 12

// Shared gameplay-environment art — not per-character, so (like the wave
// scenario logic below) it stays local to this file rather than joining
// data/lineupCharacters.ts, which is specifically the character mapping.
const BASE = import.meta.env.BASE_URL
const WAVES_DIR = `${BASE}images/lineup/waves`
const OCEAN_SRC = `${WAVES_DIR}/ocean-lineup.png`
const WAVE_PEELING_RIGHT_SRC = `${WAVES_DIR}/wave-peeling-right.png`
const WAVE_DUMP_SRC = `${WAVES_DIR}/wave-dump.png`

// TOP TURN 10: same BASE_URL-prefixed path strategy as the art above, so
// audio resolves correctly under the GitHub Pages /ai-wave-lab/ base, not
// just on localhost.
const AUDIO_DIR = `${BASE}audio/lineup`
const OCEAN_LOOP_SRC = `${AUDIO_DIR}/ocean-loop.mp3`
const CLEAN_RIDE_SFX_SRC = `${AUDIO_DIR}/clean-ride.mp3`
const WIPEOUT_SFX_SRC = `${AUDIO_DIR}/wipeout.mp3`
// Subtle atmosphere, not a competing layer under feedback/SFX — picked
// from the middle of the requested 0.20-0.30 range.
const OCEAN_AMBIENCE_VOLUME = 0.25
const SOUND_ENABLED_STORAGE_KEY = 'lineupSoundEnabled'

function readSoundEnabled(): boolean {
  try {
    const stored = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY)
    // No stored preference yet — default enabled (TOP TURN 10, Part H).
    // This only decides whether audio *would* play; it never triggers
    // playback itself, since that still waits for a real user gesture
    // (see the phase-reactive effect below).
    return stored === null ? true : stored === 'true'
  } catch {
    // Storage can throw (private browsing, disabled storage) — default
    // enabled rather than crashing the page over a convenience feature.
    return true
  }
}

type Phase = 'setup' | 'ready' | 'playing' | 'wipeout'

// Only three wave scenarios exist so far, and nothing beyond this file
// needs to know about them yet (no priority/paddle-up logic reads it) —
// kept as a plain local union instead of a shared data module, unlike the
// character mapping in data/lineupCharacters.ts.
const WAVE_DIRECTIONS = ['left', 'right', 'dump'] as const
type WaveDirection = (typeof WAVE_DIRECTIONS)[number]

function pickWaveDirection(exclude?: WaveDirection): WaveDirection {
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
type LineupScenario = 'clear' | 'priority-surfer' | 'paddle-out-surfer'
const PRIORITY_SCENARIO_CHANCE = 0.25 // 25% of non-dump waves
const PADDLE_OUT_SCENARIO_CHANCE = 0.2 // 20% of non-dump waves
// remainder (55%) is 'clear' — kept implicit rather than its own named
// constant, since it's just "whatever's left"

function pickScenario(direction: WaveDirection): LineupScenario {
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
type NpcRelationship =
  | 'npc-priority'
  | 'player-priority'
  | 'blocking'
  | 'clear-line'
  | null
const HAZARD_RELATIONSHIP_CHANCE = 0.5 // 50/50 split between the hazardous and safe spatial variant, within whichever scenario was chosen

function pickRelationship(scenario: LineupScenario): NpcRelationship {
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
function npcPositionClass(
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

function pickNpcCharacter(excludePlayerId: string) {
  const options = LINEUP_CHARACTERS.filter((c) => c.id !== excludePlayerId)
  return options[Math.floor(Math.random() * options.length)]
}

// TOP TURN 08: the first-run tutorial is four FIXED waves — not a
// separate engine, just fixed (direction, scenario, relationship) inputs
// fed into the exact same beginWave/resolveAction path normal random
// waves use (see beginWave's tutorialOverride parameter). Reusing
// pickScenario/pickRelationship's output shapes here (rather than a new
// duplicate scenario model) is what keeps the resolver in resolveAction
// completely untouched by tutorial mode — it can't tell a tutorial wave
// from a random one except via the title/instruction text.
interface TutorialWaveConfig {
  direction: WaveDirection
  scenario: LineupScenario
  relationship: NpcRelationship
  title: string
  instruction: string
}

const TUTORIAL_WAVES: TutorialWaveConfig[] = [
  {
    direction: 'right',
    scenario: 'clear',
    relationship: null,
    title: 'READ THE WAVE',
    instruction: 'Tap RIGHT when the wave gets close.',
  },
  {
    direction: 'dump',
    scenario: 'clear',
    relationship: null,
    title: "DUMP = DON'T GO",
    instruction: 'Press STOP.',
  },
  {
    direction: 'right',
    scenario: 'priority-surfer',
    relationship: 'npc-priority',
    title: 'PRIORITY',
    instruction: 'Closest surfer to the peak goes first.',
  },
  {
    direction: 'right',
    scenario: 'paddle-out-surfer',
    relationship: 'blocking',
    title: 'CLEAR THE LINE',
    instruction: "Don't take off into a surfer paddling out.",
  },
]

const TUTORIAL_WAVE_DURATION_MS = 3200 // fixed easiest pace throughout the tutorial — never the progressive curve
const TUTORIAL_OUTRO_MS = 1400 // how long "YOU'RE ON YOUR OWN" shows before real WAVE 01 begins
const TUTORIAL_COMPLETED_STORAGE_KEY = 'lineupTutorialCompleted'

function readTutorialCompleted(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_COMPLETED_STORAGE_KEY) === 'true'
  } catch {
    // Storage can throw (private browsing, disabled storage) — treat as
    // "not completed" rather than crashing the page over a convenience
    // feature; the tutorial just won't be remembered this session.
    return false
  }
}

// TOP TURN 09: the "KNOW YOUR SURFER" pose guide always uses SURFER 01
// (LUA) as the example, regardless of who the player picked — a fixed
// id lookup rather than `selectedCharacter`, computed once at module
// load since LINEUP_CHARACTERS is static.
const POSE_GUIDE_CHARACTER = LINEUP_CHARACTERS.find((c) => c.id === 'surfer01')

interface PoseGuideEntry {
  spriteKey: keyof LineupCharacterSprites
  label: string
  caption: string
}

// Order matters for layout, not just teaching sequence: PADDLE and
// PADDLE OUT are adjacent here so they stay adjacent in the rendered
// grid (see .lineup-pose-guide__grid in App.css) — the two poses players
// most often confuse during gameplay.
const POSE_GUIDE_ENTRIES: PoseGuideEntry[] = [
  { spriteKey: 'wait', label: 'WAIT', caption: 'WATCH THE LINEUP' },
  { spriteKey: 'paddle', label: 'PADDLE', caption: 'GOING FOR THE WAVE' },
  { spriteKey: 'paddleout', label: 'PADDLE OUT', caption: 'HEADING BACK OUT' },
  { spriteKey: 'ride', label: 'RIDE', caption: 'CLEAN TAKEOFF' },
  { spriteKey: 'wipeout', label: 'WIPEOUT', caption: 'BAD CALL' },
]

// Progressive speed (TOP TURN 07.2; retuned in 07.3 — first to a gentler
// curve after playtesting found the original tiers compressed too fast
// against a fixed RESULT_DISPLAY_MS causing visual overlap [the actual
// fix for that is INTER_WAVE_GAP_MS below, not the curve itself], then to
// this slightly more aggressive curve so the pace increase reads clearly
// by wave 5-8): the incoming-wave animation gets faster as the player
// survives more waves, via a small staircase of named tiers rather than a
// continuous formula — easy to read, easy to retune. 2100ms is an
// explicit floor; the game never gets faster than that in this stage.
const WAVE_DURATION_TIER_1_MS = 3200 // waves 1-4
const WAVE_DURATION_TIER_2_MS = 2900 // waves 5-8
const WAVE_DURATION_TIER_3_MS = 2600 // waves 9-12
const WAVE_DURATION_TIER_4_MS = 2300 // waves 13-16
const WAVE_DURATION_TIER_5_MS = 2100 // waves 17+ (floor)

function getWaveDurationMs(waveNumber: number): number {
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

const RESULT_DISPLAY_MS = 1100 // how long feedback + ride/wipeout sprite shows before advancing
// How long the player (and, during a priority scenario, the NPC — see
// schedulePaddleTransition) stays on WAIT before switching to PADDLE at
// the start of a wave — purely cosmetic (TOP TURN 05.1 / 07.2),
// independent of the takeoff-timing ratios above and NOT scaled by wave
// speed.
const PADDLE_TRANSITION_MS = 500
// TOP TURN 07.3: a distinct pause between "result finished displaying"
// and "next wave begins", deliberately separate from RESULT_DISPLAY_MS —
// the previous wave/NPC/feedback are cleared the moment this gap starts
// (see enterGap), so this is purely "how long the lineup sits empty"
// before the next wave is allowed to mount, guaranteeing a beat where
// nothing from the old wave can still be on screen when the new one
// appears.
const INTER_WAVE_GAP_MS = 900

type WaveState = 'incoming' | 'result' | 'gap'
type PlayerAction = 'left' | 'stop' | 'right'
type PlayerSpriteState = 'wait' | 'paddle' | 'ride' | 'wipeout'
// The NPC never wipes out in this stage — it only ever waits, paddles
// (priority NPC, facing-camera), paddles out (paddle-out NPC, dedicated
// rear-view pose — TOP TURN 08.4), or demonstrates taking the wave it has
// priority on.
type NpcSpriteState = 'wait' | 'paddle' | 'paddleout' | 'ride'
type FeedbackTone = 'success' | 'neutral' | 'danger'
interface Feedback {
  text: string
  tone: FeedbackTone
}

// The playable page for a project, kept isolated from ProjectDetail so
// game logic never has to live inside (or fight with) the general
// case-study layout. TOP TURN 05 adds the first complete playable loop:
// wave direction + takeoff timing + LEFT/STOP/RIGHT judgment + a RIDES
// counter + a WIPEOUT run-end screen. TOP TURN 05.1 is cosmetic only — it
// adds the PADDLE sprite as an automatic WAIT -> PADDLE transition at the
// start of each wave. TOP TURN 06 adds the first lineup-etiquette rule: a
// priority surfer near the peak, who must be respected with STOP even on
// an otherwise-surfable wave. TOP TURN 07 adds a second, same-shaped
// hazard (a surfer paddling back out through the line) and fixes RIDE
// sprites to face the actual wave direction. TOP TURN 07.1 splits both
// hazards into a hazardous and a safe spatial variant (NPC presence alone
// no longer implies danger — see the NpcRelationship comment and
// resolveAction for the full precedence) and fixes the incoming wave
// spawning above the ocean on tall/mobile viewports (see .lineup-wave-wrap
// in App.css). TOP TURN 07.2 makes NPC intent readable through motion
// (priority NPC stays put; paddle-out NPC visibly drifts outside — see
// the JSX comment above .lineup-stage__npc) and adds a progressive speed
// curve (getWaveDurationMs) with the takeoff-timing window expressed as
// ratios of that duration instead of fixed ms, so judgment and the CSS
// wave animation always agree on how fast the current wave is. TOP TURN
// 07.3 gentles that curve (see the WAVE_DURATION_TIER_* comment) and adds
// an explicit `'gap'` wave state (see enterGap) between a result finishing
// and the next wave starting, so the previous wave/NPC/feedback are always
// fully cleared and a fixed pause elapses before the next wave can ever
// appear — the actual fix for the overlap that a purely faster duration
// curve had been causing. TOP TURN 08 adds a first-run tutorial: four
// fixed lessons (TUTORIAL_WAVES) fed through the same beginWave/
// resolveAction path as normal play via `tutorialStep` (null = normal
// random gameplay); mistakes retry the same lesson instead of ending the
// run (see advanceAfterResult/missAfterResult/wipeoutAfterResult), and
// completion is remembered in localStorage
// (TUTORIAL_COMPLETED_STORAGE_KEY) so only a player's first-ever session
// sees it by default.
function LineupGame({ slug }: { slug: string }) {
  const project = getProjectBySlug(slug)

  // Local, component-scoped state — deliberately not lifted or wrapped in
  // a reducer/context. `phase` is the seam later TOP TURNs extend (e.g. a
  // shared leaderboard phase) without rewriting this file.
  const [phase, setPhase] = useState<Phase>('setup')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [waveDirection, setWaveDirection] = useState<WaveDirection>('left')
  // Bumped on every new wave and used as the wave element's `key`, forcing
  // React to remount it so the CSS approach animation restarts cleanly
  // even if the direction happens to repeat.
  const [waveKey, setWaveKey] = useState(0)
  const [waveNumber, setWaveNumber] = useState(1)
  // Recomputed once per wave in beginWave (TOP TURN 07.2) — drives both
  // the takeoff-timing ratio math in resolveAction and the CSS custom
  // property that sets the wave animation's actual speed, so both stay
  // locked to the same number.
  const [waveDurationMs, setWaveDurationMs] = useState(WAVE_DURATION_TIER_1_MS)
  const [rides, setRides] = useState(0)
  const [waveState, setWaveState] = useState<WaveState>('incoming')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [playerSprite, setPlayerSprite] = useState<PlayerSpriteState>('wait')
  const [wipeoutReason, setWipeoutReason] = useState('')
  const [scenario, setScenario] = useState<LineupScenario>('clear')
  const [relationship, setRelationship] = useState<NpcRelationship>(null)
  // null whenever scenario is 'clear' — this is the single source of
  // truth for "is there an NPC this wave", not a separate boolean, so it
  // can never drift out of sync with which NPC is shown.
  const [npcCharacterId, setNpcCharacterId] = useState<string | null>(null)
  const [npcSprite, setNpcSprite] = useState<NpcSpriteState>('wait')
  // TOP TURN 08: null = normal random gameplay; an index into
  // TUTORIAL_WAVES = currently running that fixed lesson. Lazy initializer
  // so localStorage is only read once, on mount.
  const [tutorialStep, setTutorialStep] = useState<number | null>(null)
  const [tutorialCompleted, setTutorialCompleted] = useState(readTutorialCompleted)
  const [showTutorialOutro, setShowTutorialOutro] = useState(false)
  // TOP TURN 09: shown once, between tutorial step 0 (READ THE WAVE) and
  // step 1 (DUMP) — see advanceTutorial. Not a wave/lesson of its own (no
  // beginWave call, no timing, no resolveAction judgment), just a static
  // overlay the player dismisses with Continue, so it's a single boolean
  // rather than another TUTORIAL_WAVES-style entry.
  const [showPoseGuide, setShowPoseGuide] = useState(false)
  // TOP TURN 10: lazy initializer, same pattern as tutorialCompleted —
  // localStorage read once, on mount. Only controls whether the three
  // Audio elements are muted; it never triggers playback itself (see the
  // phase-reactive ocean-ambience effect for the actual "begin only
  // after a user gesture" logic).
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled)

  // Refs, not state: `inputLockedRef` must block a second action
  // synchronously (a React state check can lose a race with a very fast
  // double-click, since the state update that disables the buttons hasn't
  // committed yet); `waveStartRef` is the timing clock a state variable
  // has no reason to be; `resultTimerRef`/`gapTimerRef` let every exit path
  // (new wave, leaving `playing`, unmount) cancel a pending auto-advance so
  // it can never fire against state the player has already moved past.
  const inputLockedRef = useRef(false)
  const waveStartRef = useRef(Date.now())
  const resultTimerRef = useRef<number | null>(null)
  const gapTimerRef = useRef<number | null>(null)
  const paddleTimerRef = useRef<number | null>(null)
  const outroTimerRef = useRef<number | null>(null)
  // TOP TURN 10: one HTMLAudioElement per sound, created once on mount
  // (see the effect below) and reused for the component's whole
  // lifetime — never recreated on render, never more than one instance
  // each, so repeated plays/mute toggles can't accumulate duplicate
  // overlapping playback.
  const oceanAudioRef = useRef<HTMLAudioElement | null>(null)
  const cleanRideAudioRef = useRef<HTMLAudioElement | null>(null)
  const wipeoutAudioRef = useRef<HTMLAudioElement | null>(null)

  function clearResultTimer() {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current)
      resultTimerRef.current = null
    }
  }

  function clearGapTimer() {
    if (gapTimerRef.current !== null) {
      window.clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
  }

  function clearPaddleTimer() {
    if (paddleTimerRef.current !== null) {
      window.clearTimeout(paddleTimerRef.current)
      paddleTimerRef.current = null
    }
  }

  function clearOutroTimer() {
    if (outroTimerRef.current !== null) {
      window.clearTimeout(outroTimerRef.current)
      outroTimerRef.current = null
    }
  }

  function clearTimers() {
    clearResultTimer()
    clearGapTimer()
    clearPaddleTimer()
    clearOutroTimer()
  }

  // One-shot per wave: WAIT -> PADDLE once the wave "begins approaching",
  // for the player always, and for the NPC only when it's the priority
  // scenario's WAIT -> PADDLE -> RIDE sequence (TOP TURN 08.4: takes
  // `nextScenario` as a parameter rather than reading the `scenario` state
  // closure, which would still hold the *previous* wave's value here —
  // this runs synchronously inside beginWave, before that render's
  // setScenario has committed). A paddle-out NPC is set straight to
  // 'paddleout' by beginWave and must stay there — this only ever
  // upgrades a priority NPC's 'wait' to 'paddle', never touches a
  // paddle-out NPC's sprite. Cancelled the moment the player acts (see
  // resolveAction) so it can never fire after either sprite has already
  // moved to ride/wipeout/wait for a result.
  function schedulePaddleTransition(nextScenario: LineupScenario) {
    clearPaddleTimer()
    paddleTimerRef.current = window.setTimeout(() => {
      paddleTimerRef.current = null
      setPlayerSprite('paddle')
      if (nextScenario === 'priority-surfer') {
        setNpcSprite('paddle')
      }
    }, PADDLE_TRANSITION_MS)
  }

  // Sets up one wave's direction + lineup scenario (+ NPC, if any) + speed
  // as plain local variables computed up front, then applied via direct
  // (non-functional) setState calls — deliberately not
  // `setWaveDirection((current) => ...)` with side effects nested inside,
  // since StrictMode invokes functional updaters twice in development and
  // a random NPC pick living inside one would silently re-roll. Takes the
  // wave number as a parameter rather than reading the `waveNumber` state
  // variable, since state set earlier in the same call (startNextWave)
  // hasn't committed yet when this runs. Shared by startSession (full run
  // reset), startNextWave (mid-run advance), and — via `tutorialOverride`
  // (TOP TURN 08) — the tutorial, which skips the random picks entirely
  // and feeds a fixed TUTORIAL_WAVES entry through this exact same setup
  // instead of a separate tutorial-only code path.
  function beginWave(
    excludeDirection: WaveDirection | undefined,
    waveNumberForThisWave: number,
    tutorialOverride?: TutorialWaveConfig,
  ) {
    const direction = tutorialOverride
      ? tutorialOverride.direction
      : pickWaveDirection(excludeDirection)
    const nextScenario = tutorialOverride
      ? tutorialOverride.scenario
      : pickScenario(direction)
    const nextRelationship = tutorialOverride
      ? tutorialOverride.relationship
      : pickRelationship(nextScenario)
    const npc =
      nextScenario !== 'clear' && characterId
        ? pickNpcCharacter(characterId)
        : null
    const durationMs = tutorialOverride
      ? TUTORIAL_WAVE_DURATION_MS
      : getWaveDurationMs(waveNumberForThisWave)

    // Every call site is "a fresh wave is now ready for input" — normal
    // gameplay's advance, a tutorial retry, or a tutorial advance — so the
    // unlock belongs here once rather than duplicated at each caller (TOP
    // TURN 08 found this had to move here: the tutorial's retry/advance
    // paths call beginWave without going through startSession/
    // startNextWave, which used to be the only places that reset this).
    inputLockedRef.current = false
    waveStartRef.current = Date.now()
    setWaveDirection(direction)
    setScenario(nextScenario)
    setRelationship(nextRelationship)
    setNpcCharacterId(npc ? npc.id : null)
    // Priority NPC waits, then paddles, then rides once respected — the
    // usual wait->paddle transition applies (see schedulePaddleTransition).
    // The paddle-out NPC is already mid-paddle-back-out the moment it
    // appears, so it starts on the dedicated 'paddleout' pose (TOP TURN
    // 08.4) directly rather than 'wait', and stays there for the whole
    // decision phase — schedulePaddleTransition only ever upgrades a
    // *priority* NPC's sprite, never a paddle-out one's.
    setNpcSprite(nextScenario === 'paddle-out-surfer' ? 'paddleout' : 'wait')
    setWaveDurationMs(durationMs)
    setWaveKey((key) => key + 1)
    setWaveState('incoming')
    setFeedback(null)
    setPlayerSprite('wait')
    schedulePaddleTransition(nextScenario)
  }

  // Shared by "Start Session" (ready -> playing) and "Try Again"
  // (wipeout -> playing): a full reset of the run, not just the wave.
  // Explicitly clears tutorialStep — this is always the entry point for
  // normal random gameplay, never the tutorial (see startTutorial below).
  function startSession() {
    clearTimers()
    setTutorialStep(null)
    setShowTutorialOutro(false)
    setShowPoseGuide(false)
    setRides(0)
    setWaveNumber(1)
    beginWave(undefined, 1)
    setPhase('playing')
  }

  // TOP TURN 08: entry point for the tutorial, mirroring startSession but
  // starting on TUTORIAL_WAVES[0] instead of a random wave. Used both for
  // a first-ever session (ready screen's primary CTA) and for a deliberate
  // replay ("Play Tutorial") — neither path touches localStorage itself;
  // only actually finishing the tutorial (see completeTutorial) does.
  function startTutorial() {
    clearTimers()
    setShowTutorialOutro(false)
    setShowPoseGuide(false)
    setRides(0)
    setWaveNumber(1)
    setTutorialStep(0)
    beginWave(undefined, 1, TUTORIAL_WAVES[0])
    setPhase('playing')
  }

  // "Skip Tutorial" (TOP TURN 08): marks the tutorial as completed for
  // this browser without ever running it, then starts normal gameplay
  // exactly as "Start Session" would.
  function skipTutorial() {
    try {
      window.localStorage.setItem(TUTORIAL_COMPLETED_STORAGE_KEY, 'true')
    } catch {
      // Storage may be unavailable — the skip still applies to this
      // session, it just won't be remembered next time.
    }
    setTutorialCompleted(true)
    startSession()
  }

  // Advances to the next wave WITHOUT resetting the run (rides/wave count
  // carry over) — used after every non-run-ending result: skip, miss,
  // priority respected, or a clean takeoff.
  function startNextWave() {
    const nextWaveNumber = waveNumber + 1
    setWaveNumber(nextWaveNumber)
    beginWave(waveDirection, nextWaveNumber)
  }

  // TOP TURN 07.3: the step between "result finished" and "next wave
  // begins" — clears everything the previous wave left behind (wave art
  // unmounts via the `waveState !== 'gap'` check below, NPC unmounts
  // because npcCharacter becomes undefined once npcCharacterId is null,
  // feedback and the hazard hint clear because scenario/relationship reset
  // too) in one state update, then holds empty for INTER_WAVE_GAP_MS
  // before `afterGap` runs. This is what actually guarantees no overlap —
  // not the duration tiers themselves. TOP TURN 08 generalized this from
  // always calling startNextWave to taking a callback, so the tutorial's
  // "retry this lesson" / "advance to the next lesson" paths get the exact
  // same clean-clear-pause behavior as normal gameplay instead of a
  // separate transition.
  function enterGap(afterGap: () => void) {
    setWaveState('gap')
    setFeedback(null)
    setPlayerSprite('wait')
    setScenario('clear')
    setRelationship(null)
    setNpcCharacterId(null)
    clearGapTimer()
    gapTimerRef.current = window.setTimeout(() => {
      gapTimerRef.current = null
      afterGap()
    }, INTER_WAVE_GAP_MS)
  }

  // Runs after every non-run-ending, non-tutorial result: shows the result
  // for RESULT_DISPLAY_MS, then hands off to enterGap (NOT straight to
  // startNextWave) so the previous wave is always fully cleared and the
  // inter-wave gap always elapses first.
  function scheduleNextWave() {
    clearResultTimer()
    resultTimerRef.current = window.setTimeout(() => {
      resultTimerRef.current = null
      enterGap(startNextWave)
    }, RESULT_DISPLAY_MS)
  }

  // TOP TURN 08: advances from the current tutorial lesson to the next
  // one, or finishes the tutorial once the last one (index 3, CLEAR THE
  // LINE) has been passed. TOP TURN 09: stepping off lesson 0 (READ THE
  // WAVE, the "basic controls / wave-reading" lesson) shows the pose
  // guide instead of immediately starting lesson 1 (DUMP) — this is
  // still well before lesson 2 (PRIORITY), the first lesson where an NPC
  // pose actually matters. `tutorialStep` deliberately stays at 0 while
  // the guide is up (no wave is active — enterGap already cleared the
  // stage before this ran — so nothing reads it during this pause);
  // handlePoseGuideContinue does the actual advance once the player
  // dismisses it.
  function advanceTutorial() {
    const currentStep = tutorialStep ?? 0
    const nextStep = currentStep + 1
    if (nextStep >= TUTORIAL_WAVES.length) {
      completeTutorial()
      return
    }
    if (currentStep === 0) {
      setShowPoseGuide(true)
      return
    }
    setTutorialStep(nextStep)
    beginWave(undefined, waveNumber, TUTORIAL_WAVES[nextStep])
  }

  // TOP TURN 09: dismisses the pose guide and actually starts tutorial
  // lesson 1 (DUMP) — the step advanceTutorial deferred above.
  function handlePoseGuideContinue() {
    setShowPoseGuide(false)
    const nextStep = (tutorialStep ?? 0) + 1
    setTutorialStep(nextStep)
    beginWave(undefined, waveNumber, TUTORIAL_WAVES[nextStep])
  }

  // TOP TURN 08: marks the tutorial completed in localStorage (best
  // effort — see readTutorialCompleted), shows "YOU'RE ON YOUR OWN" for
  // TUTORIAL_OUTRO_MS over the already-empty (gap) stage, then starts real
  // gameplay at WAVE 01 / RIDES 0, exactly like startSession would.
  function completeTutorial() {
    try {
      window.localStorage.setItem(TUTORIAL_COMPLETED_STORAGE_KEY, 'true')
    } catch {
      // Storage may be unavailable — the tutorial still completes for this
      // session, it just won't be remembered next time.
    }
    setTutorialCompleted(true)
    setTutorialStep(null)
    setShowTutorialOutro(true)
    clearOutroTimer()
    outroTimerRef.current = window.setTimeout(() => {
      outroTimerRef.current = null
      setShowTutorialOutro(false)
      setRides(0)
      setWaveNumber(1)
      beginWave(undefined, 1)
    }, TUTORIAL_OUTRO_MS)
  }

  // TOP TURN 08: the tutorial's equivalent of scheduleNextWave — shows the
  // result for RESULT_DISPLAY_MS, then either advances to the next lesson
  // (`success`) or retries the exact same one (feeding TUTORIAL_WAVES at
  // the *current* index back into beginWave) via the same enterGap pause
  // normal gameplay uses.
  function scheduleTutorialStep(success: boolean) {
    const stepToRetry = tutorialStep ?? 0
    clearResultTimer()
    resultTimerRef.current = window.setTimeout(() => {
      resultTimerRef.current = null
      enterGap(() => {
        if (success) {
          advanceTutorial()
        } else {
          beginWave(undefined, waveNumber, TUTORIAL_WAVES[stepToRetry])
        }
      })
    }, RESULT_DISPLAY_MS)
  }

  // TOP TURN 08: the three outcome dispatchers resolveAction's branches
  // call instead of scheduleNextWave/scheduleWipeout directly. Outside
  // tutorial mode (tutorialStep === null) each one falls through to the
  // exact pre-08 behavior. During tutorial, only the exact correct action
  // for the current fixed lesson counts as success (advanceAfterResult);
  // everything else — including outcomes that are merely neutral in
  // normal play, like WAVE SKIPPED/TOO EARLY/TOO LATE — retries the same
  // lesson (missAfterResult/wipeoutAfterResult) instead of ending the run
  // or moving on, so tutorial mistakes teach rather than punish.
  function advanceAfterResult() {
    if (tutorialStep !== null) {
      scheduleTutorialStep(true)
    } else {
      scheduleNextWave()
    }
  }

  function missAfterResult() {
    if (tutorialStep !== null) {
      scheduleTutorialStep(false)
    } else {
      scheduleNextWave()
    }
  }

  function wipeoutAfterResult(reason: string) {
    // TOP TURN 10, Part E: this is the single call site for every
    // dangerous-failure branch (WRONG WAY, CLOSEOUT, DROP-IN, COLLISION —
    // see resolveAction), so hooking the SFX in here once covers all four
    // without a parallel audio-only rule list. Fires during tutorial
    // retries too, on purpose — the spec explicitly wants that ("the
    // audio reinforces this was a dangerous call").
    playWipeoutSfx()
    if (tutorialStep !== null) {
      scheduleTutorialStep(false)
    } else {
      scheduleWipeout(reason)
    }
  }

  function scheduleWipeout(reason: string) {
    clearResultTimer()
    resultTimerRef.current = window.setTimeout(() => {
      resultTimerRef.current = null
      setWipeoutReason(reason)
      setPhase('wipeout')
    }, RESULT_DISPLAY_MS)
  }

  // The whole judgment: wave direction + STOP-vs-directional rules +
  // takeoff timing. Wrong-wave judgment (WRONG WAY, CLOSEOUT) ends the
  // run; a timing miss (TOO EARLY/TOO LATE) or a voluntary skip does not.
  // Resolution order (TOP TURN 07.1) — deliberately checked in this
  // sequence, most specific/dangerous first:
  //   1. DUMP, a whole different wave type
  //   2. does the NPC actually have priority? (scenario is priority-surfer
  //      AND relationship is 'npc-priority' — a priority-surfer scenario
  //      where the NPC is instead on the shoulder is NOT a hazard)
  //   3. does the paddle-out NPC actually block the line? (scenario is
  //      paddle-out-surfer AND relationship is 'blocking' — a clear-line
  //      paddle-out NPC is visible but not in the way)
  //   4. wave direction, then
  //   5. takeoff timing
  // Steps 4-5 are the same TOP TURN 05 logic, reached both when there's no
  // NPC at all (clear scenario) and when there's a "safe" NPC (steps 2-3
  // didn't match) — NPC presence alone never implies STOP; only its
  // *position*, checked above, does.
  function resolveAction(action: PlayerAction) {
    if (inputLockedRef.current) return
    inputLockedRef.current = true
    clearPaddleTimer()
    setWaveState('result')

    const elapsed = (Date.now() - waveStartRef.current) % waveDurationMs
    const progress = elapsed / waveDurationMs
    const timing: 'early' | 'good' | 'late' =
      progress < TAKEOFF_EARLY_END_RATIO
        ? 'early'
        : progress < TAKEOFF_WINDOW_END_RATIO
          ? 'good'
          : 'late'

    if (waveDirection === 'dump') {
      if (action === 'stop') {
        setFeedback({ text: 'GOOD CALL', tone: 'success' })
        setPlayerSprite('wait')
        advanceAfterResult()
      } else {
        setFeedback({ text: 'CLOSEOUT!', tone: 'danger' })
        setPlayerSprite('wipeout')
        wipeoutAfterResult('CLOSEOUT!')
      }
      return
    }

    if (scenario === 'priority-surfer' && relationship === 'npc-priority') {
      if (action === 'stop') {
        setFeedback({ text: 'PRIORITY RESPECTED', tone: 'success' })
        setPlayerSprite('wait')
        setNpcSprite('ride')
        advanceAfterResult()
      } else {
        setFeedback({ text: 'DROP-IN!', tone: 'danger' })
        setPlayerSprite('wipeout')
        setNpcSprite('ride')
        wipeoutAfterResult('YOU DROPPED IN ON A SURFER WITH PRIORITY.')
      }
      return
    }

    if (scenario === 'paddle-out-surfer' && relationship === 'blocking') {
      if (action === 'stop') {
        setFeedback({ text: 'LINE CLEAR', tone: 'success' })
        setPlayerSprite('wait')
        advanceAfterResult()
      } else {
        setFeedback({ text: 'COLLISION!', tone: 'danger' })
        setPlayerSprite('wipeout')
        wipeoutAfterResult('YOU COLLIDED WITH A SURFER PADDLING OUT.')
      }
      return
    }

    if (action === 'stop') {
      setFeedback({ text: 'WAVE SKIPPED', tone: 'neutral' })
      setPlayerSprite('wait')
      missAfterResult()
      return
    }

    if (action !== waveDirection) {
      setFeedback({ text: 'WRONG WAY', tone: 'danger' })
      setPlayerSprite('wipeout')
      wipeoutAfterResult('WRONG WAY')
      return
    }

    if (timing === 'early') {
      setFeedback({ text: 'TOO EARLY', tone: 'neutral' })
      setPlayerSprite('wait')
      missAfterResult()
    } else if (timing === 'late') {
      setFeedback({ text: 'TOO LATE', tone: 'neutral' })
      setPlayerSprite('wait')
      missAfterResult()
    } else {
      setFeedback({ text: 'CLEAN TAKEOFF', tone: 'success' })
      setPlayerSprite('ride')
      // TOP TURN 10, Part D: the one and only branch that produces an
      // actual CLEAN TAKEOFF — GOOD CALL/PRIORITY RESPECTED/LINE CLEAR
      // all route through advanceAfterResult too, but never land here, so
      // this is the correct single call site rather than something
      // hooked into advanceAfterResult generically.
      playCleanRideSfx()
      // RIDES never counts during the tutorial (TOP TURN 08, section 3).
      if (tutorialStep === null) {
        setRides((r) => r + 1)
      }
      advanceAfterResult()
    }
  }

  // Unmount-only cleanup. Reads resultTimerRef.current at call time (refs
  // aren't subject to closure staleness), so this stays correct even
  // though the effect itself never re-runs.
  useEffect(() => {
    return () => clearTimers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard is a secondary input path — buttons remain primary/only path
  // on mobile. Re-attaches whenever phase/waveState/waveDirection change
  // so the closure always judges against the current wave, not a stale
  // one from when the listener was first attached. Declared before the
  // early-return guard below (with every hook above it) so Hooks are
  // always called in the same order, regardless of `project`.
  useEffect(() => {
    if (phase !== 'playing') return

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }
      if (waveState !== 'incoming') return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        resolveAction('left')
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        resolveAction('right')
      } else if (event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault()
        resolveAction('stop')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, waveState, waveDirection])

  // TOP TURN 10: creates the three HTMLAudioElements exactly once, on
  // mount — never inside a render or a per-event handler, so nothing can
  // recreate them (Part I). `muted` starts from the current soundEnabled
  // value (correct even though this closure never re-runs, since a
  // mount-only effect always sees the state its own render computed);
  // every later toggle is handled by the separate mute-sync effect below,
  // not by re-running this one. Cleanup pauses and drops the references
  // so nothing keeps decoding/playing after the component unmounts.
  useEffect(() => {
    const ocean = new Audio(OCEAN_LOOP_SRC)
    ocean.loop = true
    ocean.volume = OCEAN_AMBIENCE_VOLUME
    ocean.muted = !soundEnabled
    oceanAudioRef.current = ocean

    const cleanRide = new Audio(CLEAN_RIDE_SFX_SRC)
    cleanRide.muted = !soundEnabled
    cleanRideAudioRef.current = cleanRide

    const wipeoutSfx = new Audio(WIPEOUT_SFX_SRC)
    wipeoutSfx.muted = !soundEnabled
    wipeoutAudioRef.current = wipeoutSfx

    return () => {
      ocean.pause()
      cleanRide.pause()
      wipeoutSfx.pause()
      oceanAudioRef.current = null
      cleanRideAudioRef.current = null
      wipeoutAudioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // TOP TURN 10, Part G: keeps all three elements' `muted` in sync with
  // the toggle — the *only* thing muting does. It never pauses/stops
  // ocean ambience outright (so unmuting mid-wave just makes the
  // already-running loop audible again, satisfying "resume cleanly... do
  // NOT replay old effects") and never touches clean-ride/wipeout's
  // playback position (there's nothing to resume — they're one-shots).
  useEffect(() => {
    const muted = !soundEnabled
    if (oceanAudioRef.current) oceanAudioRef.current.muted = muted
    if (cleanRideAudioRef.current) cleanRideAudioRef.current.muted = muted
    if (wipeoutAudioRef.current) wipeoutAudioRef.current.muted = muted
  }, [soundEnabled])

  // TOP TURN 10, Part B: the single source of truth for ocean ambience
  // start/stop — reacts to `phase` rather than being wired into every
  // individual handler (Start Session, Start Tutorial, Try Again, Play
  // Tutorial, Exit Session, Change Surfer all just change `phase`, and
  // this responds uniformly, so nothing can be missed). Playing whenever
  // phase is 'playing' (tutorial + normal gameplay + every in-between
  // result/gap moment nested inside it) or 'wipeout' (Part B explicitly
  // allows ambience to continue quietly on the results screen) means:
  // - it only ever calls .play() as a direct reaction to a phase change
  //   that itself only ever happens inside a user-click handler, never on
  //   initial mount (phase starts at 'setup') — satisfying "begin only
  //   after user interaction" without a separate autoplay/gesture flag.
  // - the `ocean.paused` guard makes it idempotent: Try Again transitions
  //   wipeout -> playing, both of which already keep ambience playing, so
  //   this branch is skipped and the loop is never interrupted/restarted
  //   — no duplicate overlapping instances (Part G).
  useEffect(() => {
    const ocean = oceanAudioRef.current
    if (!ocean) return
    if (phase === 'playing' || phase === 'wipeout') {
      if (ocean.paused) {
        const playResult = ocean.play()
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {
            // Autoplay blocked, decode failure, etc. — audio is
            // best-effort and must never affect gameplay (Part J).
          })
        }
      }
    } else {
      ocean.pause()
    }
  }, [phase])

  // TOP TURN 10, Part D/E: reused for both one-shot SFX — reset
  // currentTime to 0 before every play() so the *same* single instance
  // (never a new Audio()) restarts cleanly from the top instead of
  // layering a second overlapping playback on top of one still running.
  function playCleanRideSfx() {
    const audio = cleanRideAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    const playResult = audio.play()
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {})
    }
  }

  function playWipeoutSfx() {
    const audio = wipeoutAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    const playResult = audio.play()
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {})
    }
  }

  // TOP TURN 10: persists the toggle (best effort — storage can throw in
  // private browsing) and flips `soundEnabled`, which the mute-sync
  // effect above turns into actually muting/unmuting all three elements.
  function toggleSound() {
    const next = !soundEnabled
    setSoundEnabled(next)
    try {
      window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(next))
    } catch {
      // Storage unavailable — the toggle still applies this session, it
      // just won't be remembered next time.
    }
  }

  if (!project || !project.playable) {
    return (
      <section className="lineup-game">
        <div className="container">
          <Link href="/" className="text-link project-detail__back">
            ← Selected Waves
          </Link>

          <p className="project-detail__missing">
            This wave hasn't broken yet.
          </p>
        </div>
      </section>
    )
  }

  const selectedCharacter = LINEUP_CHARACTERS.find((c) => c.id === characterId)
  const npcCharacter = LINEUP_CHARACTERS.find((c) => c.id === npcCharacterId)
  const trimmedNickname = nickname.trim()
  const canEnter = Boolean(selectedCharacter) && trimmedNickname.length > 0

  const handleEnter = () => {
    if (!canEnter) return
    setPhase('ready')
  }

  const handleExitSession = () => {
    clearTimers()
    setPhase('ready')
  }

  const handleTryAgain = () => startSession()

  const handleChangeSurferFromWipeout = () => {
    clearTimers()
    setPhase('setup')
  }

  const spriteSrc = selectedCharacter ? selectedCharacter.sprites[playerSprite] : ''
  // The only player sprite that ever needs to face a direction: WAIT/
  // PADDLE/WIPEOUT stay in their existing (unmirrored) orientation — see
  // TOP TURN 05.1 — since nothing about them reads as "wrong" facing one
  // way. A successful RIDE, though, should visibly face the way the
  // player actually went.
  const playerRideMirrored = playerSprite === 'ride' && waveDirection === 'left'

  const spriteAltSuffix =
    playerSprite === 'paddle'
      ? 'paddling for the wave'
      : playerSprite === 'ride'
        ? 'riding the wave'
        : playerSprite === 'wipeout'
          ? 'wiping out'
          : 'waiting in the lineup'

  // Neutral, rule-only hints (TOP TURN 07.1) — never state which side
  // currently has priority or whether the paddle-out surfer is actually
  // blocking. The player reads that from NPC position, same as a real
  // lineup; the hint just states the standing rule.
  const hazardHint =
    scenario === 'priority-surfer'
      ? 'Priority: Closest To The Peak'
      : scenario === 'paddle-out-surfer'
        ? 'Paddle Out: Keep The Line Clear'
        : null

  // Describes the NPC's physical position/situation only — the same
  // information a sighted player already gets from where the sprite is
  // drawn, not the game's verdict on it (never says "has priority" or
  // "is safe" outright).
  const npcAltSuffix =
    scenario === 'priority-surfer'
      ? relationship === 'npc-priority'
        ? 'sitting deep, near the peak'
        : 'sitting out toward the shoulder'
      : relationship === 'blocking'
        ? 'paddling out through your riding line'
        : 'paddling out, clear of your riding line'

  // TOP TURN 08.3: 08.1/08.2 shrank the whole stage to force every piece
  // of external UI (HUD, hints, controls) to fit above/below a cropped
  // ocean — that traded away real wave-travel distance and was rolled
  // back (see App.css: the stage is back to its original aspect-ratio,
  // and the wave uses the original shared lineup-wave-approach keyframes
  // on every viewport, not a desktop-only shrunk copy). The large page
  // title is still hidden during active gameplay/tutorial (Part G of this
  // TOP TURN keeps that part), but plainly in JSX now rather than via a
  // desktop-only CSS class, since nothing about vertical space is being
  // fought over anymore — HUD/tutorial/controls all live inside the
  // stage itself now (see .lineup-stage__top-zone / .lineup-stage__controls
  // below), not stacked in the page's normal flow above/below it.
  const isPlayingPhase = phase === 'playing'

  return (
    <section className="lineup-game">
      <div className="container lineup-game__inner">
        <Link
          href={`/projects/${project.slug}`}
          className="text-link project-detail__back"
        >
          ← {project.title}
        </Link>

        <span className="project-row__number">{project.waveNumber}</span>

        {!isPlayingPhase && (
          <h1 className="lineup-game__title">
            {project.title.toUpperCase()}
          </h1>
        )}

        {phase === 'setup' && (
          <>
            <p className="lineup-game__label">
              Choose your surfer and paddle out.
            </p>

            <div
              className="lineup-character-grid"
              role="radiogroup"
              aria-label="Choose your surfer"
            >
              {LINEUP_CHARACTERS.map((character) => {
                const selected = character.id === characterId
                return (
                  <button
                    key={character.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`lineup-character-card ${
                      selected ? 'lineup-character-card--selected' : ''
                    }`}
                    onClick={() => setCharacterId(character.id)}
                  >
                    <img
                      className="lineup-character-card__portrait"
                      src={character.portrait}
                      alt={`${character.name} — ${character.label}`}
                    />

                    {/* TOP TURN 09: name is now the primary label; the
                        generic SURFER XX tag stays as small secondary
                        metadata underneath, read from the same character
                        data — never hardcoded per component. */}
                    <span className="lineup-character-card__label">
                      <span className="lineup-character-card__name">
                        {character.name}
                      </span>
                      <span className="lineup-character-card__tag">
                        {character.label}
                      </span>
                    </span>

                    {selected && (
                      <span
                        className="lineup-character-card__check"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="lineup-nickname">
              <label
                className="lineup-nickname__label"
                htmlFor="lineup-nickname-input"
              >
                Your Surf Name
              </label>

              <input
                id="lineup-nickname-input"
                className="lineup-nickname__input"
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="SUNNY"
                maxLength={NICKNAME_MAX_LENGTH}
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              className="project-cta project-cta--primary lineup-game__start"
              disabled={!canEnter}
              onClick={handleEnter}
            >
              Enter The Lineup
            </button>
          </>
        )}

        {phase === 'ready' && selectedCharacter && (
          <div className="lineup-ready">
            <img
              className="lineup-ready__portrait"
              src={selectedCharacter.portrait}
              alt={selectedCharacter.label}
            />

            <p className="lineup-ready__character">
              {selectedCharacter.label}
            </p>

            <p className="lineup-ready__nickname">{trimmedNickname}</p>

            <p className="lineup-ready__headline">You’re in the lineup</p>

            <div className="lineup-ready__actions">
              <button
                type="button"
                className="project-cta project-cta--primary lineup-game__start"
                onClick={tutorialCompleted ? startSession : startTutorial}
              >
                {tutorialCompleted ? 'Start Session' : 'Start Tutorial'}
              </button>

              {/* TOP TURN 08: a first-ever session offers Skip Tutorial
                  (marks completed, jumps straight to normal play); once
                  completed, the same slot offers Play Tutorial (replay
                  without touching the completion flag — see
                  startTutorial). */}
              <button
                type="button"
                className="text-link lineup-ready__secondary"
                onClick={tutorialCompleted ? startTutorial : skipTutorial}
              >
                {tutorialCompleted ? 'Play Tutorial' : 'Skip Tutorial'}
              </button>

              <button
                type="button"
                className="text-link lineup-ready__change"
                onClick={() => setPhase('setup')}
              >
                Change Surfer
              </button>
            </div>
          </div>
        )}

        {phase === 'playing' && selectedCharacter && (
          <div className="lineup-playing">
            {/* TOP TURN 08.3, Part G: DEV-only, kept small/unobtrusive —
                the production layout is never optimized around it. */}
            <div className="lineup-dev-actions">
              <button
                type="button"
                className="text-link lineup-playing__exit"
                onClick={handleExitSession}
              >
                ← Exit Session (Dev)
              </button>
            </div>

            {/* TOP TURN 09, Part F: the pose guide replaces the stage
                entirely rather than rendering inside it — the stage's
                fixed aspect-ratio (16/10 desktop, 4/5 mobile; see Part H
                "do not touch stage dimensions") isn't spacious enough for
                five sprite+label+caption items without cramming, so this
                keeps the guide in the page's normal document flow instead
                of fighting that fixed box. Still fully part of the
                existing tutorial flow (same phase, same tutorialStep
                state machine — see advanceTutorial/handlePoseGuideContinue)
                and never shown during normal (non-tutorial) gameplay. */}
            {showPoseGuide && selectedCharacter && POSE_GUIDE_CHARACTER && (
              <div className="lineup-pose-guide">
                <p className="lineup-pose-guide__title">KNOW YOUR SURFER</p>
                <p className="lineup-pose-guide__subtitle">
                  Read the pose before you make the call.
                </p>

                <div className="lineup-pose-guide__grid">
                  {POSE_GUIDE_ENTRIES.map((entry) => (
                    <div
                      key={entry.spriteKey}
                      className={`lineup-pose-guide__item lineup-pose-guide__item--${entry.spriteKey}`}
                    >
                      <img
                        className="lineup-pose-guide__sprite"
                        src={POSE_GUIDE_CHARACTER.sprites[entry.spriteKey]}
                        alt={`${POSE_GUIDE_CHARACTER.name} — ${entry.label}`}
                      />
                      <p className="lineup-pose-guide__label">
                        {entry.label}
                      </p>
                      <p className="lineup-pose-guide__caption">
                        {entry.caption}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="project-cta project-cta--primary lineup-pose-guide__continue"
                  onClick={handlePoseGuideContinue}
                >
                  Continue
                </button>
              </div>
            )}

            {!showPoseGuide && (
            <div className="lineup-stage">
              <div className="lineup-stage__sky" />
              <div
                className="lineup-stage__ocean"
                style={
                  {
                    backgroundImage: `url(${OCEAN_SRC})`,
                    // Single source of truth for wave speed (TOP TURN
                    // 07.2): set once here from waveDurationMs, read by
                    // both .lineup-wave-wrap's animation-duration and the
                    // paddle-out NPC's drift animation below (CSS custom
                    // properties inherit), so the visual wave, the NPC
                    // drift, and the JS judgment in resolveAction can
                    // never disagree about how fast this wave is.
                    '--lineup-wave-duration': `${waveDurationMs}ms`,
                  } as CSSProperties
                }
              >
                {/* Wrapper handles the incoming-wave *position/depth*
                    (animated `top` + `scale`); the inner <img> handles
                    LEFT/RIGHT *mirroring* (static scaleX). Two separate
                    elements so the approach animation can never clobber
                    the mirror transform, or vice versa. TOP TURN 07.3:
                    unmounted entirely once the wave reaches the inter-wave
                    gap (see enterGap) — the old wave must be fully gone,
                    not just finished animating, before the next one can
                    ever appear. TOP TURN 08.3: back to the original
                    lineup-wave-approach keyframes on every viewport — the
                    desktop-only shrunk copy from 08.2 is gone along with
                    the shrunk stage it was compensating for (see
                    App.css). */}
                {waveState !== 'gap' && (
                  <div key={`wave-${waveKey}`} className="lineup-wave-wrap">
                    <img
                      className={`lineup-wave-img ${
                        waveDirection === 'left'
                          ? 'lineup-wave-img--mirrored'
                          : ''
                      }`}
                      src={
                        waveDirection === 'dump'
                          ? WAVE_DUMP_SRC
                          : WAVE_PEELING_RIGHT_SRC
                      }
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                )}

                {/* Position is the whole game (TOP TURN 07.1, Part E):
                    NPC presence alone is never the hazard signal, only
                    where they're sitting relative to the peak/player/line
                    is — see npcPositionClass. Reuses the same wrapper/img
                    split as the wave above, so position and the
                    LEFT-vs-RIGHT mirror never fight over one transform.
                    TOP TURN 07.2: a paddle-out NPC also drifts toward the
                    outside (a separate transform, on this same wrapper,
                    that only ever animates `translateY` — it's additive
                    with the static `translateX(-50%)` centering, never
                    replacing it) so it reads as "paddling back out"
                    rather than "paddling for this wave", which a
                    stationary priority NPC still communicates by staying
                    put. `key={waveKey}` restarts that drift fresh on every
                    new wave, same as the wave art itself. */}
                {npcCharacter && (
                  <div
                    key={`npc-${waveKey}`}
                    className={`lineup-stage__npc ${npcPositionClass(
                      scenario,
                      relationship,
                      waveDirection,
                    )} ${
                      scenario === 'paddle-out-surfer'
                        ? 'lineup-stage__npc--drifting'
                        : ''
                    }`}
                  >
                    <img
                      className={`lineup-stage__npc-sprite ${
                        waveDirection === 'left'
                          ? 'lineup-stage__npc-sprite--mirrored'
                          : ''
                      }`}
                      src={npcCharacter.sprites[npcSprite]}
                      alt={`${npcCharacter.label} ${npcAltSuffix}`}
                    />
                  </div>
                )}

                <div className="lineup-stage__player">
                  {/* Bob animation lives on this middle wrapper (its own
                      `transform`, via keyframes) so the RIDE mirror below
                      — a plain static `transform: scaleX(-1)` on the img
                      — never has to share/fight over the same property. */}
                  <div className="lineup-stage__sprite-bob">
                    <img
                      className={`lineup-stage__sprite ${
                        playerRideMirrored ? 'lineup-stage__sprite--mirrored' : ''
                      }`}
                      src={spriteSrc}
                      alt={`${selectedCharacter.label} ${spriteAltSuffix}`}
                    />
                  </div>
                </div>
              </div>

              {/* TOP TURN 08.3, Part B/E: the "TOP UI ZONE" — HUD (WAVE /
                  RIDES / nickname / WAVE READ) as a compact overlay pinned
                  to the stage's own top edge. Absolutely positioned inside
                  .lineup-stage (a sibling of sky/ocean, not a flex child of
                  either) so it never adds to the stage's own height or
                  pushes the ocean down — it just paints on top of the sky.
                  Semi-opaque so it stays readable over both sky and, if
                  content wraps taller than the sky band, the ocean art
                  beneath it. */}
              <div className="lineup-stage__top-zone">
                <div className="lineup-stage__hud">
                  <span className="lineup-stage__hud-item">
                    WAVE {String(waveNumber).padStart(2, '0')}
                  </span>
                  <span className="lineup-stage__hud-item">
                    RIDES {rides}
                  </span>
                  <span className="lineup-stage__hud-item lineup-stage__hud-item--nickname">
                    {trimmedNickname}
                  </span>
                  <span className="lineup-stage__hud-item lineup-stage__hud-item--wave-read">
                    {waveDirection.toUpperCase()}
                  </span>

                  {/* TOP TURN 10, Part F: one compact utility button in
                      the HUD row itself — the literal "HUD area" the spec
                      calls out — rather than a separate panel. The emoji
                      is aria-hidden; the real accessible name is the
                      explicit aria-label, so screen readers never depend
                      on the icon alone. */}
                  <button
                    type="button"
                    className="lineup-stage__sound-toggle"
                    onClick={toggleSound}
                    aria-label={
                      soundEnabled ? 'Mute game audio' : 'Enable game audio'
                    }
                  >
                    <span aria-hidden="true">
                      {soundEnabled ? '🔊' : '🔇'}
                    </span>
                  </button>
                </div>

                {/* TOP TURN 08.3, Part C: tutorial copy moves inside the
                    stage's top zone too — same short-title + one-instruction
                    shape as before (TOP TURN 08), just repositioned so it
                    overlays the sky instead of sitting in the page's normal
                    flow above the stage. */}
                {tutorialStep !== null && (
                  <div className="lineup-stage__tutorial-panel">
                    <p className="lineup-stage__tutorial-panel-title">
                      {TUTORIAL_WAVES[tutorialStep].title}
                    </p>
                    <p className="lineup-stage__tutorial-panel-instruction">
                      {TUTORIAL_WAVES[tutorialStep].instruction}
                    </p>
                  </div>
                )}

                {showTutorialOutro && (
                  <div className="lineup-stage__tutorial-panel lineup-stage__tutorial-panel--outro">
                    <p className="lineup-stage__tutorial-panel-title">
                      YOU’RE ON YOUR OWN
                    </p>
                  </div>
                )}

                {/* Outside tutorial, the hazard rule takes the tutorial
                    panel's old spot instead — the two never show at once,
                    since a fixed tutorial lesson's own instruction text
                    already covers the same rule when tutorialStep is set. */}
                {tutorialStep === null && !showTutorialOutro && hazardHint && (
                  <p className="lineup-stage__hazard-hint">{hazardHint}</p>
                )}
              </div>

              {feedback && (
                <div
                  className={`lineup-stage__feedback lineup-stage__feedback--${feedback.tone}`}
                  aria-live="polite"
                >
                  {feedback.text}
                </div>
              )}

              {/* TOP TURN 08.3, Part D/E: the "BOTTOM CONTROL ZONE" —
                  LEFT/STOP/RIGHT overlaid on the stage's own bottom edge
                  over a subtle darkening backdrop, rather than a separate
                  row below the stage. Absolutely positioned the same way
                  as the top zone, so it doesn't add to the stage's height;
                  the player/NPC sit well clear of it at the restored
                  stage size (see .lineup-stage__player/.lineup-stage__npc
                  bottom offsets in App.css). Keyboard support (ArrowLeft/
                  ArrowRight/ArrowDown/Space) is unchanged — it never
                  depended on these buttons' position in the DOM. */}
              <div className="lineup-stage__controls" aria-label="Surf controls">
                <button
                  type="button"
                  className="lineup-controls__button"
                  disabled={waveState !== 'incoming'}
                  onClick={() => resolveAction('left')}
                >
                  Left
                </button>
                <button
                  type="button"
                  className="lineup-controls__button lineup-controls__button--stop"
                  disabled={waveState !== 'incoming'}
                  onClick={() => resolveAction('stop')}
                >
                  Stop
                </button>
                <button
                  type="button"
                  className="lineup-controls__button"
                  disabled={waveState !== 'incoming'}
                  onClick={() => resolveAction('right')}
                >
                  Right
                </button>
              </div>
            </div>
            )}
          </div>
        )}

        {phase === 'wipeout' && selectedCharacter && (
          <div className="lineup-wipeout">
            <img
              className="lineup-wipeout__portrait"
              src={selectedCharacter.sprites.wipeout}
              alt={`${selectedCharacter.label} wiped out`}
            />

            <p className="lineup-wipeout__headline">Wipeout</p>

            <p className="lineup-wipeout__character">
              {selectedCharacter.label}
            </p>
            <p className="lineup-wipeout__nickname">{trimmedNickname}</p>

            <p className="lineup-wipeout__rides">Rides: {rides}</p>
            <p className="lineup-wipeout__reason">{wipeoutReason}</p>

            <div className="lineup-wipeout__actions">
              <button
                type="button"
                className="project-cta project-cta--primary lineup-game__start"
                onClick={handleTryAgain}
              >
                Try Again
              </button>

              <button
                type="button"
                className="text-link"
                onClick={handleChangeSurferFromWipeout}
              >
                Change Surfer
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default LineupGame
