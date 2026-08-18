import type { LineupCharacter } from '../../data/lineupCharacters'

// TOP TURN 11.3A: extracted from LineupGame's `phase === 'ready'` JSX,
// verbatim — presentational only. LineupGame keeps owning
// selectedCharacter/nickname/tutorialCompleted and every one of these
// callbacks (startSession/startTutorial/skipTutorial/change-surfer); this
// component just renders the current selection and calls back up.
interface LineupReadyProps {
  character: LineupCharacter
  nickname: string
  tutorialCompleted: boolean
  onStartSession: () => void
  onStartTutorial: () => void
  onSkipTutorial: () => void
  onChangeSurfer: () => void
}

function LineupReady({
  character,
  nickname,
  tutorialCompleted,
  onStartSession,
  onStartTutorial,
  onSkipTutorial,
  onChangeSurfer,
}: LineupReadyProps) {
  return (
    <div className="lineup-ready">
      <img
        className="lineup-ready__portrait"
        src={character.portrait}
        alt={character.label}
      />

      <p className="lineup-ready__character">{character.label}</p>

      <p className="lineup-ready__nickname">{nickname}</p>

      <p className="lineup-ready__headline">You’re in the lineup</p>

      <div className="lineup-ready__actions">
        <button
          type="button"
          className="project-cta project-cta--primary lineup-game__start"
          onClick={tutorialCompleted ? onStartSession : onStartTutorial}
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
          onClick={tutorialCompleted ? onStartTutorial : onSkipTutorial}
        >
          {tutorialCompleted ? 'Play Tutorial' : 'Skip Tutorial'}
        </button>

        <button
          type="button"
          className="text-link lineup-ready__change"
          onClick={onChangeSurfer}
        >
          Change Surfer
        </button>
      </div>
    </div>
  )
}

export default LineupReady
