import LineupLeaderboard from './LineupLeaderboard'
import type { LineupCharacter } from '../../data/lineupCharacters'
import type { LineupScore } from '../../lib/lineupLeaderboard'

// TOP TURN 11.3D: extracted from LineupGame's `phase === 'wipeout'` JSX,
// verbatim — presentational only. LineupGame keeps owning phase
// orchestration, the leaderboard submit-then-fetch lifecycle
// (scoreSubmittedRef, submitLineupScore/getTopLineupScores), and the
// Try Again / Change Surfer state-transition logic behind the callbacks
// below; this component only renders the current result and calls back
// up. LineupLeaderboard is reused here (not re-inlined) the same way
// LineupHUD/LineupControls are reused inside LineupStage.
interface LineupWipeoutResultProps {
  character: LineupCharacter
  nickname: string
  rides: number
  reason: string
  onTryAgain: () => void
  onChangeSurfer: () => void
  leaderboardStatus: 'idle' | 'loading' | 'ready' | 'error'
  leaderboardEntries: LineupScore[]
  submittedScore: LineupScore | null
}

function LineupWipeoutResult({
  character,
  nickname,
  rides,
  reason,
  onTryAgain,
  onChangeSurfer,
  leaderboardStatus,
  leaderboardEntries,
  submittedScore,
}: LineupWipeoutResultProps) {
  return (
    <div className="lineup-wipeout">
      <img
        className="lineup-wipeout__portrait"
        src={character.sprites.wipeout}
        alt={`${character.label} wiped out`}
      />

      <p className="lineup-wipeout__headline">Wipeout</p>

      <p className="lineup-wipeout__character">{character.label}</p>
      <p className="lineup-wipeout__nickname">{nickname}</p>

      <p className="lineup-wipeout__rides">Rides: {rides}</p>
      <p className="lineup-wipeout__reason">{reason}</p>

      <div className="lineup-wipeout__actions">
        <button
          type="button"
          className="project-cta project-cta--primary lineup-game__start"
          onClick={onTryAgain}
        >
          Try Again
        </button>

        <button type="button" className="text-link" onClick={onChangeSurfer}>
          Change Surfer
        </button>
      </div>

      {/* TOP TURN 10.2: extends the existing wipeout screen — not a
          separate route/modal. */}
      <LineupLeaderboard
        status={leaderboardStatus}
        entries={leaderboardEntries}
        submittedScore={submittedScore}
      />
    </div>
  )
}

export default LineupWipeoutResult
