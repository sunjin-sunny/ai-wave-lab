import type { WaveDirection } from '../../lib/lineupGameLogic'

// TOP TURN 11.3B: extracted from LineupGame's `.lineup-stage__hud` JSX,
// verbatim — presentational only. LineupGame keeps owning waveNumber,
// rides, nickname, waveDirection, soundEnabled, and the toggleSound
// function itself (including the audio refs/effects it drives) — this
// component just renders the current values and calls back up. The
// tutorial panel / outro / hazard hint that share the surrounding
// `.lineup-stage__top-zone` are NOT part of the HUD and stay in
// LineupGame.tsx (see TOP TURN 08.3, Part B/E's original comment) —
// this only extracts `.lineup-stage__hud` itself.
interface LineupHUDProps {
  waveNumber: number
  rides: number
  nickname: string
  waveDirection: WaveDirection
  soundEnabled: boolean
  onToggleSound: () => void
}

function LineupHUD({
  waveNumber,
  rides,
  nickname,
  waveDirection,
  soundEnabled,
  onToggleSound,
}: LineupHUDProps) {
  return (
    <div className="lineup-stage__hud">
      <span className="lineup-stage__hud-item">
        WAVE {String(waveNumber).padStart(2, '0')}
      </span>
      <span className="lineup-stage__hud-item">RIDES {rides}</span>
      <span className="lineup-stage__hud-item lineup-stage__hud-item--nickname">
        {nickname}
      </span>
      <span className="lineup-stage__hud-item lineup-stage__hud-item--wave-read">
        {waveDirection.toUpperCase()}
      </span>

      {/* TOP TURN 10, Part F: one compact utility button in the HUD row
          itself — the literal "HUD area" the spec calls out — rather
          than a separate panel. The emoji is aria-hidden; the real
          accessible name is the explicit aria-label, so screen readers
          never depend on the icon alone. */}
      <button
        type="button"
        className="lineup-stage__sound-toggle"
        onClick={onToggleSound}
        aria-label={soundEnabled ? 'Mute game audio' : 'Enable game audio'}
      >
        <span aria-hidden="true">{soundEnabled ? '🔊' : '🔇'}</span>
      </button>
    </div>
  )
}

export default LineupHUD
