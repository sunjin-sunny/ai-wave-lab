import type { CSSProperties } from 'react'
import LineupHUD from './LineupHUD'
import LineupControls from './LineupControls'
import type { LineupCharacter } from '../../data/lineupCharacters'
import { npcPositionClass } from '../../lib/lineupGameLogic'
import type {
  WaveDirection,
  LineupScenario,
  NpcRelationship,
} from '../../lib/lineupGameLogic'
import type { WaveState, NpcSpriteState, Feedback } from '../LineupGame'

// Shared gameplay-environment art — TOP TURN 11.3C: moved here from
// LineupGame.tsx since it's only used by this stage's own JSX now, same
// BASE_URL-prefixed convention used throughout the project (see
// data/lineupCharacters.ts, data/projects.ts) so it resolves correctly
// under the GitHub Pages /ai-wave-lab/ base, not just on localhost.
const BASE = import.meta.env.BASE_URL
const WAVES_DIR = `${BASE}images/lineup/waves`
const OCEAN_SRC = `${WAVES_DIR}/ocean-lineup.png`
const WAVE_PEELING_RIGHT_SRC = `${WAVES_DIR}/wave-peeling-right.png`
const WAVE_DUMP_SRC = `${WAVES_DIR}/wave-dump.png`

// TOP TURN 11.3C: extracted from LineupGame's `.lineup-stage` JSX,
// verbatim — a RENDERER, not a second controller. Every value here was
// already decided by LineupGame (phase, wave direction/duration/state,
// NPC scenario/relationship/character, player sprite, feedback,
// tutorial content) — this component only maps that decided state to
// DOM. LineupGame keeps owning every ref, timer, and piece of gameplay
// state; nothing here calls resolveAction, beginWave, or any of the
// tutorial-advancement functions directly — only the LEFT/STOP/RIGHT
// callbacks passed in, which LineupGame wires to resolveAction itself.
interface LineupStageProps {
  // ocean / incoming wave
  waveDurationMs: number
  waveState: WaveState
  waveKey: number
  waveDirection: WaveDirection

  // NPC — scenario/relationship/waveDirection are passed through (not
  // re-derived) because npcPositionClass is a pure function of exactly
  // these three already-decided values; calling it here is the same
  // "pure render mapping" it always was, just co-located with the JSX
  // that consumes its result instead of being called from LineupGame's
  // JSX. See TOP TURN 11.3C Part 5 for why this is the preferred
  // boundary over threading a precomputed class name.
  npcCharacter: LineupCharacter | undefined
  npcSprite: NpcSpriteState
  scenario: LineupScenario
  relationship: NpcRelationship
  npcAltSuffix: string

  // player
  selectedCharacter: LineupCharacter
  spriteSrc: string
  playerRideMirrored: boolean
  spriteAltSuffix: string

  // HUD (already-extracted LineupHUD, reused here — not re-inlined)
  waveNumber: number
  rides: number
  nickname: string
  soundEnabled: boolean
  onToggleSound: () => void

  // tutorial / hazard overlays — LineupGame resolves tutorialStep into
  // this already-computed { title, instruction } pair (or null) rather
  // than Stage importing TUTORIAL_WAVES itself, so Stage never needs to
  // know tutorial content lives in a lookup table indexed by step.
  tutorialPanel: { title: string; instruction: string } | null
  showTutorialOutro: boolean
  hazardHint: string | null

  // result feedback
  feedback: Feedback | null

  // bottom control zone (already-extracted LineupControls, reused here)
  controlsDisabled: boolean
  onLeft: () => void
  onStop: () => void
  onRight: () => void
}

function LineupStage({
  waveDurationMs,
  waveState,
  waveKey,
  waveDirection,
  npcCharacter,
  npcSprite,
  scenario,
  relationship,
  npcAltSuffix,
  selectedCharacter,
  spriteSrc,
  playerRideMirrored,
  spriteAltSuffix,
  waveNumber,
  rides,
  nickname,
  soundEnabled,
  onToggleSound,
  tutorialPanel,
  showTutorialOutro,
  hazardHint,
  feedback,
  controlsDisabled,
  onLeft,
  onStop,
  onRight,
}: LineupStageProps) {
  return (
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
        <LineupHUD
          waveNumber={waveNumber}
          rides={rides}
          nickname={nickname}
          waveDirection={waveDirection}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
        />

        {/* TOP TURN 08.3, Part C: tutorial copy moves inside the
            stage's top zone too — same short-title + one-instruction
            shape as before (TOP TURN 08), just repositioned so it
            overlays the sky instead of sitting in the page's normal
            flow above the stage. */}
        {tutorialPanel && (
          <div className="lineup-stage__tutorial-panel">
            <p className="lineup-stage__tutorial-panel-title">
              {tutorialPanel.title}
            </p>
            <p className="lineup-stage__tutorial-panel-instruction">
              {tutorialPanel.instruction}
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
        {!tutorialPanel && !showTutorialOutro && hazardHint && (
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
      <LineupControls
        disabled={controlsDisabled}
        onLeft={onLeft}
        onStop={onStop}
        onRight={onRight}
      />
    </div>
  )
}

export default LineupStage
