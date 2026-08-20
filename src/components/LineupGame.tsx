import { useEffect, useRef, useState } from 'react'
import '../LineupGame.css'
import Link from './Link'
import LineupCharacterSelect from './lineup/LineupCharacterSelect'
import LineupReady from './lineup/LineupReady'
import LineupStage from './lineup/LineupStage'
import LineupWipeoutResult from './lineup/LineupWipeoutResult'
import { getProjectBySlug } from '../data/projects'
import { LINEUP_CHARACTERS } from '../data/lineupCharacters'
import type { LineupCharacterSprites } from '../data/lineupCharacters'
import { submitLineupScore, getTopLineupScores } from '../lib/lineupLeaderboard'
import type { LineupScore } from '../lib/lineupLeaderboard'
import {
  pickWaveDirection,
  pickScenario,
  pickRelationship,
  pickNpcCharacter,
  getWaveDurationMs,
  WAVE_DURATION_TIER_1_MS,
  classifyTakeoffTiming,
} from '../lib/lineupGameLogic'
import type {
  WaveDirection,
  LineupScenario,
  NpcRelationship,
} from '../lib/lineupGameLogic'

const NICKNAME_MAX_LENGTH = 12

const BASE = import.meta.env.BASE_URL
// TOP TURN 11.3C: the wave/ocean art path constants that used to live
// here (WAVES_DIR/OCEAN_SRC/etc.) moved to LineupStage.tsx, since that's
// the only place that renders them now — same BASE_URL-prefixed
// convention, just declared locally there instead of threaded down as
// props. AUDIO_DIR stays here since audio playback stays owned by this
// component.
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

// TOP TURN 11.3C: exported (WaveState, NpcSpriteState, Feedback) so
// LineupStage.tsx can type the props LineupGame passes it — a type-only
// import, fully erased by verbatimModuleSyntax, so this doesn't create a
// real runtime dependency from LineupStage back onto this file.
export type WaveState = 'incoming' | 'result' | 'gap'
type PlayerAction = 'left' | 'stop' | 'right'
type PlayerSpriteState = 'wait' | 'paddle' | 'ride' | 'wipeout'
// The NPC never wipes out in this stage — it only ever waits, paddles
// (priority NPC, facing-camera), paddles out (paddle-out NPC, dedicated
// rear-view pose — TOP TURN 08.4), or demonstrates taking the wave it has
// priority on.
export type NpcSpriteState = 'wait' | 'paddle' | 'paddleout' | 'ride'
export type FeedbackTone = 'success' | 'neutral' | 'danger'
export interface Feedback {
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
  // TOP TURN 10.2: the wipeout screen's leaderboard. 'idle' before any run
  // has ended in a real wipeout this session; the submit-then-fetch effect
  // below is the only thing that ever moves it past 'idle'. `submittedScore`
  // is the exact row Supabase returned for THIS run's insert (used only to
  // highlight it in `leaderboardEntries` — see the render below), and stays
  // null whenever submission didn't succeed, so no fake rank is ever shown.
  const [leaderboardStatus, setLeaderboardStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [leaderboardEntries, setLeaderboardEntries] = useState<LineupScore[]>(
    [],
  )
  const [submittedScore, setSubmittedScore] = useState<LineupScore | null>(
    null,
  )

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
  // TOP TURN 10.2: the actual duplicate-submission guard (not the
  // [phase] effect dependency array alone — see the submit-then-fetch
  // effect below). Reset only in beginWave, exactly when a genuinely new
  // submittable run's wave 1 begins (see that reset's comment), so an
  // incidental re-render while still on the wipeout screen (e.g. toggling
  // sound) can never trigger a second insert for the same run.
  const scoreSubmittedRef = useRef(false)

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
    // TOP TURN 10.2: wave 1 of a non-tutorial run is the one and only
    // moment a genuinely new, submittable run begins — true both for
    // startSession's call and for completeTutorial's post-tutorial
    // `beginWave(undefined, 1)` (which never goes through startSession).
    // Mid-run advances (waveNumberForThisWave > 1) and every tutorial-
    // lesson call (tutorialOverride set) must NOT reset this, or a
    // still-pending submission guard from the run in progress could be
    // cleared early.
    if (!tutorialOverride && waveNumberForThisWave === 1) {
      scoreSubmittedRef.current = false
    }
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
    const timing = classifyTakeoffTiming(elapsed, waveDurationMs)

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

  // TOP TURN 10.2: submits this run's score exactly once when a run ends
  // in a real WIPEOUT, then fetches the Top 10 regardless of whether that
  // submission succeeded (a network/config failure must never hide the
  // rest of the leaderboard — see lineupLeaderboard.ts). This can only
  // ever fire for a genuine run-ending wipeout: scheduleWipeout (the only
  // place that sets phase to 'wipeout') is itself only reached from
  // wipeoutAfterResult when tutorialStep is null, so tutorial mistakes —
  // which retry the lesson instead — never reach this at all. All access
  // to Supabase stays inside lineupLeaderboard.ts; this only ever calls
  // its two exported functions.
  useEffect(() => {
    if (phase !== 'wipeout') return
    // scoreSubmittedRef (reset in beginWave, not here) is the actual
    // duplicate guard — see its declaration. This effect is keyed only on
    // `phase` so it can't refire from an incidental re-render while still
    // on the wipeout screen, but the ref makes that guarantee explicit
    // rather than relying solely on the dependency array.
    if (scoreSubmittedRef.current) return
    if (!characterId) return
    scoreSubmittedRef.current = true

    const characterIdForSubmission = characterId
    const nicknameForSubmission = trimmedNickname
    const ridesForSubmission = rides
    const waveReachedForSubmission = waveNumber

    let cancelled = false
    setLeaderboardStatus('loading')
    setSubmittedScore(null)

    async function submitAndFetch() {
      const submitResult = await submitLineupScore({
        nickname: nicknameForSubmission,
        characterId: characterIdForSubmission,
        rides: ridesForSubmission,
        waveReached: waveReachedForSubmission,
      })
      if (cancelled) return
      if (submitResult.ok) {
        setSubmittedScore(submitResult.data)
      }

      const topResult = await getTopLineupScores()
      if (cancelled) return
      if (topResult.ok) {
        setLeaderboardEntries(topResult.data)
        setLeaderboardStatus('ready')
      } else {
        setLeaderboardStatus('error')
      }
    }

    submitAndFetch()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // TOP TURN 11.3C: resolves tutorialStep into the exact content
  // LineupStage's tutorial panel renders, so Stage never needs to import
  // TUTORIAL_WAVES itself — it only renders whatever content the parent
  // decided is current, same as every other piece of stage state.
  const tutorialPanel =
    tutorialStep !== null
      ? {
          title: TUTORIAL_WAVES[tutorialStep].title,
          instruction: TUTORIAL_WAVES[tutorialStep].instruction,
        }
      : null

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
          <LineupCharacterSelect
            selectedCharacterId={characterId}
            onSelectCharacter={setCharacterId}
            nickname={nickname}
            onNicknameChange={setNickname}
            nicknameMaxLength={NICKNAME_MAX_LENGTH}
            canEnter={canEnter}
            onEnter={handleEnter}
          />
        )}

        {phase === 'ready' && selectedCharacter && (
          <LineupReady
            character={selectedCharacter}
            nickname={trimmedNickname}
            tutorialCompleted={tutorialCompleted}
            onStartSession={startSession}
            onStartTutorial={startTutorial}
            onSkipTutorial={skipTutorial}
            onChangeSurfer={() => setPhase('setup')}
          />
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
              <LineupStage
                waveDurationMs={waveDurationMs}
                waveState={waveState}
                waveKey={waveKey}
                waveDirection={waveDirection}
                npcCharacter={npcCharacter}
                npcSprite={npcSprite}
                scenario={scenario}
                relationship={relationship}
                npcAltSuffix={npcAltSuffix}
                selectedCharacter={selectedCharacter}
                spriteSrc={spriteSrc}
                playerRideMirrored={playerRideMirrored}
                spriteAltSuffix={spriteAltSuffix}
                waveNumber={waveNumber}
                rides={rides}
                nickname={trimmedNickname}
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                tutorialPanel={tutorialPanel}
                showTutorialOutro={showTutorialOutro}
                hazardHint={hazardHint}
                feedback={feedback}
                controlsDisabled={waveState !== 'incoming'}
                onLeft={() => resolveAction('left')}
                onStop={() => resolveAction('stop')}
                onRight={() => resolveAction('right')}
              />
            )}
          </div>
        )}

        {phase === 'wipeout' && selectedCharacter && (
          <LineupWipeoutResult
            character={selectedCharacter}
            nickname={trimmedNickname}
            rides={rides}
            reason={wipeoutReason}
            onTryAgain={handleTryAgain}
            onChangeSurfer={handleChangeSurferFromWipeout}
            leaderboardStatus={leaderboardStatus}
            leaderboardEntries={leaderboardEntries}
            submittedScore={submittedScore}
          />
        )}
      </div>
    </section>
  )
}

export default LineupGame
