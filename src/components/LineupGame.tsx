import { useEffect, useRef, useState } from 'react'
import Link from './Link'
import { getProjectBySlug } from '../data/projects'
import { LINEUP_CHARACTERS } from '../data/lineupCharacters'

const NICKNAME_MAX_LENGTH = 12

// Shared gameplay-environment art — not per-character, so (like the wave
// scenario logic below) it stays local to this file rather than joining
// data/lineupCharacters.ts, which is specifically the character mapping.
const BASE = import.meta.env.BASE_URL
const WAVES_DIR = `${BASE}images/lineup/waves`
const OCEAN_SRC = `${WAVES_DIR}/ocean-lineup.png`
const WAVE_PEELING_RIGHT_SRC = `${WAVES_DIR}/wave-peeling-right.png`
const WAVE_DUMP_SRC = `${WAVES_DIR}/wave-dump.png`

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

// Takeoff-timing constants (ms). WAVE_DURATION_MS must match the
// `animation: lineup-wave-approach 3.2s ...` duration set on
// .lineup-wave-wrap in App.css — that CSS animation IS the timing
// reference the player reads visually, so this number keeps the judgment
// window in sync with what's actually on screen. Elapsed time is taken
// modulo WAVE_DURATION_MS so a wave that's looped past 100% (player took
// no action) is still judged against where it currently, visually is.
const WAVE_DURATION_MS = 3200
const TAKEOFF_EARLY_END_MS = 1400 // before this: TOO EARLY
const TAKEOFF_WINDOW_END_MS = 2400 // EARLY_END..this: valid window; after: TOO LATE
const RESULT_DISPLAY_MS = 1100 // how long feedback + ride/wipeout sprite shows before advancing
// How long the player stays on WAIT before switching to PADDLE at the
// start of a wave — purely cosmetic (TOP TURN 05.1), independent of the
// takeoff-timing constants above. Deliberately well before
// TAKEOFF_EARLY_END_MS so the player is already paddling for the entire
// decision window, not just the back half of it.
const PADDLE_TRANSITION_MS = 500

type WaveState = 'incoming' | 'result'
type PlayerAction = 'left' | 'stop' | 'right'
type PlayerSpriteState = 'wait' | 'paddle' | 'ride' | 'wipeout'
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
// start of each wave; no judgment/timing/scoring rule changed.
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
  const [rides, setRides] = useState(0)
  const [waveState, setWaveState] = useState<WaveState>('incoming')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [playerSprite, setPlayerSprite] = useState<PlayerSpriteState>('wait')
  const [wipeoutReason, setWipeoutReason] = useState('')

  // Refs, not state: `inputLockedRef` must block a second action
  // synchronously (a React state check can lose a race with a very fast
  // double-click, since the state update that disables the buttons hasn't
  // committed yet); `waveStartRef` is the timing clock a state variable
  // has no reason to be; `resultTimerRef` lets every exit path (new wave,
  // leaving `playing`, unmount) cancel a pending auto-advance so it can
  // never fire against state the player has already moved past.
  const inputLockedRef = useRef(false)
  const waveStartRef = useRef(Date.now())
  const resultTimerRef = useRef<number | null>(null)
  const paddleTimerRef = useRef<number | null>(null)

  function clearResultTimer() {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current)
      resultTimerRef.current = null
    }
  }

  function clearPaddleTimer() {
    if (paddleTimerRef.current !== null) {
      window.clearTimeout(paddleTimerRef.current)
      paddleTimerRef.current = null
    }
  }

  function clearTimers() {
    clearResultTimer()
    clearPaddleTimer()
  }

  // One-shot per wave: WAIT -> PADDLE once the wave "begins approaching".
  // Cancelled the moment the player acts (see resolveAction) so it can
  // never fire after the sprite has already moved to ride/wipeout/wait.
  function schedulePaddleTransition() {
    clearPaddleTimer()
    paddleTimerRef.current = window.setTimeout(() => {
      paddleTimerRef.current = null
      setPlayerSprite('paddle')
    }, PADDLE_TRANSITION_MS)
  }

  // Shared by "Start Session" (ready -> playing) and "Try Again"
  // (wipeout -> playing): a full reset of the run, not just the wave.
  function startSession() {
    clearTimers()
    inputLockedRef.current = false
    waveStartRef.current = Date.now()
    setRides(0)
    setWaveNumber(1)
    setWaveDirection(pickWaveDirection())
    setWaveKey((key) => key + 1)
    setWaveState('incoming')
    setFeedback(null)
    setPlayerSprite('wait')
    setPhase('playing')
    schedulePaddleTransition()
  }

  // Advances to the next wave WITHOUT resetting the run (rides/wave count
  // carry over) — used after every non-run-ending result: skip, miss, or
  // a clean takeoff.
  function startNextWave() {
    inputLockedRef.current = false
    waveStartRef.current = Date.now()
    setWaveNumber((n) => n + 1)
    setWaveDirection((current) => pickWaveDirection(current))
    setWaveKey((key) => key + 1)
    setWaveState('incoming')
    setFeedback(null)
    setPlayerSprite('wait')
    schedulePaddleTransition()
  }

  function scheduleNextWave() {
    clearResultTimer()
    resultTimerRef.current = window.setTimeout(() => {
      resultTimerRef.current = null
      startNextWave()
    }, RESULT_DISPLAY_MS)
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
  function resolveAction(action: PlayerAction) {
    if (inputLockedRef.current) return
    inputLockedRef.current = true
    clearPaddleTimer()
    setWaveState('result')

    const elapsed = (Date.now() - waveStartRef.current) % WAVE_DURATION_MS
    const timing: 'early' | 'good' | 'late' =
      elapsed < TAKEOFF_EARLY_END_MS
        ? 'early'
        : elapsed < TAKEOFF_WINDOW_END_MS
          ? 'good'
          : 'late'

    if (waveDirection === 'dump') {
      if (action === 'stop') {
        setFeedback({ text: 'GOOD CALL', tone: 'success' })
        setPlayerSprite('wait')
        scheduleNextWave()
      } else {
        setFeedback({ text: 'CLOSEOUT!', tone: 'danger' })
        setPlayerSprite('wipeout')
        scheduleWipeout('CLOSEOUT!')
      }
      return
    }

    if (action === 'stop') {
      setFeedback({ text: 'WAVE SKIPPED', tone: 'neutral' })
      setPlayerSprite('wait')
      scheduleNextWave()
      return
    }

    if (action !== waveDirection) {
      setFeedback({ text: 'WRONG WAY', tone: 'danger' })
      setPlayerSprite('wipeout')
      scheduleWipeout('WRONG WAY')
      return
    }

    if (timing === 'early') {
      setFeedback({ text: 'TOO EARLY', tone: 'neutral' })
      setPlayerSprite('wait')
      scheduleNextWave()
    } else if (timing === 'late') {
      setFeedback({ text: 'TOO LATE', tone: 'neutral' })
      setPlayerSprite('wait')
      scheduleNextWave()
    } else {
      setFeedback({ text: 'CLEAN TAKEOFF', tone: 'success' })
      setPlayerSprite('ride')
      setRides((r) => r + 1)
      scheduleNextWave()
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

  const spriteAltSuffix =
    playerSprite === 'paddle'
      ? 'paddling for the wave'
      : playerSprite === 'ride'
        ? 'riding the wave'
        : playerSprite === 'wipeout'
          ? 'wiping out'
          : 'waiting in the lineup'

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

        <h1 className="lineup-game__title">{project.title.toUpperCase()}</h1>

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
                      alt={character.label}
                    />

                    <span className="lineup-character-card__label">
                      {character.label}
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
                onClick={startSession}
              >
                Start Session
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
            <div className="lineup-dev-actions">
              <button
                type="button"
                className="text-link lineup-playing__exit"
                onClick={handleExitSession}
              >
                ← Exit Session (Dev)
              </button>
            </div>

            <div className="lineup-hud">
              <span className="lineup-hud__item">
                WAVE {String(waveNumber).padStart(2, '0')}
              </span>
              <span className="lineup-hud__item">RIDES {rides}</span>
              <span className="lineup-hud__item lineup-hud__item--nickname">
                {trimmedNickname}
              </span>
            </div>

            <p className="lineup-wave-hint">
              Wave Read: {waveDirection.toUpperCase()}
            </p>

            <div className="lineup-stage">
              <div className="lineup-stage__sky" />
              <div
                className="lineup-stage__ocean"
                style={{ backgroundImage: `url(${OCEAN_SRC})` }}
              >
                {/* Wrapper handles the incoming-wave *position/depth*
                    (animated `top` + `scale`); the inner <img> handles
                    LEFT/RIGHT *mirroring* (static scaleX). Two separate
                    elements so the approach animation can never clobber
                    the mirror transform, or vice versa. */}
                <div key={waveKey} className="lineup-wave-wrap">
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

                <div className="lineup-stage__player">
                  <img
                    className="lineup-stage__sprite"
                    src={spriteSrc}
                    alt={`${selectedCharacter.label} ${spriteAltSuffix}`}
                  />
                </div>
              </div>

              {feedback && (
                <div
                  className={`lineup-stage__feedback lineup-stage__feedback--${feedback.tone}`}
                  aria-live="polite"
                >
                  {feedback.text}
                </div>
              )}
            </div>

            <div className="lineup-controls" aria-label="Surf controls">
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
