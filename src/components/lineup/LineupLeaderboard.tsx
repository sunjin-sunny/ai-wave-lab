import { LINEUP_CHARACTERS } from '../../data/lineupCharacters'
import type { LineupScore } from '../../lib/lineupLeaderboard'

// TOP TURN 11.3D: extracted from LineupGame's `.lineup-leaderboard` JSX,
// verbatim — presentational only. LineupGame keeps owning the entire
// submit-then-fetch lifecycle (scoreSubmittedRef, the wipeout submission
// effect, submitLineupScore/getTopLineupScores) and just hands this
// component the already-resolved status/entries/submittedScore. Character
// names are resolved from LINEUP_CHARACTERS here (not duplicated into
// lineupLeaderboard.ts), exactly as the inline version did.
interface LineupLeaderboardProps {
  status: 'idle' | 'loading' | 'ready' | 'error'
  entries: LineupScore[]
  submittedScore: LineupScore | null
}

function LineupLeaderboard({
  status,
  entries,
  submittedScore,
}: LineupLeaderboardProps) {
  return (
    <div className="lineup-leaderboard">
      <p className="lineup-leaderboard__title">The Lineup</p>
      <p className="lineup-leaderboard__subtitle">Top Riders</p>

      {status === 'loading' && (
        <p className="lineup-leaderboard__status">Loading Lineup...</p>
      )}

      {status === 'error' && (
        <p className="lineup-leaderboard__status">
          The Lineup Is Quiet Right Now.
        </p>
      )}

      {status === 'ready' && entries.length === 0 && (
        <p className="lineup-leaderboard__status">
          No Riders Yet.
          <br />
          Be The First In The Lineup.
        </p>
      )}

      {status === 'ready' && entries.length > 0 && (
        <ol className="lineup-leaderboard__list">
          {entries.map((entry, index) => {
            const entryCharacter = LINEUP_CHARACTERS.find(
              (c) => c.id === entry.characterId,
            )
            const isCurrentPlayer =
              submittedScore !== null &&
              entry.createdAt === submittedScore.createdAt

            return (
              <li
                key={entry.createdAt}
                className={`lineup-leaderboard__row ${
                  isCurrentPlayer ? 'lineup-leaderboard__row--current' : ''
                }`}
              >
                <span className="lineup-leaderboard__rank">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="lineup-leaderboard__nickname">
                  {entry.nickname}
                </span>
                <span className="lineup-leaderboard__character">
                  {entryCharacter ? entryCharacter.name : entry.characterId}
                </span>
                <span className="lineup-leaderboard__rides">
                  {entry.rides} Rides
                </span>
                <span className="lineup-leaderboard__wave">
                  Wave {entry.waveReached}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default LineupLeaderboard
