// TOP TURN 11.3B: extracted from LineupGame's `.lineup-stage__controls`
// JSX, verbatim — presentational only. LineupGame keeps owning
// resolveAction, inputLockedRef, waveState, and the keyboard listener;
// this component only renders the three buttons and calls back up.
// `disabled` is a single pre-computed boolean (waveState !== 'incoming')
// passed down — this component adds no lock/debounce of its own, so the
// synchronous double-input protection stays entirely in the parent.
interface LineupControlsProps {
  disabled: boolean
  onLeft: () => void
  onStop: () => void
  onRight: () => void
}

function LineupControls({
  disabled,
  onLeft,
  onStop,
  onRight,
}: LineupControlsProps) {
  return (
    <div className="lineup-stage__controls" aria-label="Surf controls">
      <button
        type="button"
        className="lineup-controls__button"
        disabled={disabled}
        onClick={onLeft}
      >
        Left
      </button>
      <button
        type="button"
        className="lineup-controls__button lineup-controls__button--stop"
        disabled={disabled}
        onClick={onStop}
      >
        Stop
      </button>
      <button
        type="button"
        className="lineup-controls__button"
        disabled={disabled}
        onClick={onRight}
      >
        Right
      </button>
    </div>
  )
}

export default LineupControls
