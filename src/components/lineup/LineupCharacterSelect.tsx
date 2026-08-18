import { LINEUP_CHARACTERS } from '../../data/lineupCharacters'

// TOP TURN 11.3A: extracted from LineupGame's `phase === 'setup'` JSX,
// verbatim — presentational only. LineupGame keeps owning characterId,
// nickname, canEnter (nickname validation), and the phase transition;
// this component just renders the current selection/input and calls
// back up. LINEUP_CHARACTERS is imported directly (not passed as a
// prop) since it's static data, not something the parent varies.
interface LineupCharacterSelectProps {
  selectedCharacterId: string | null
  onSelectCharacter: (id: string) => void
  nickname: string
  onNicknameChange: (value: string) => void
  nicknameMaxLength: number
  canEnter: boolean
  onEnter: () => void
}

function LineupCharacterSelect({
  selectedCharacterId,
  onSelectCharacter,
  nickname,
  onNicknameChange,
  nicknameMaxLength,
  canEnter,
  onEnter,
}: LineupCharacterSelectProps) {
  return (
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
          const selected = character.id === selectedCharacterId
          return (
            <button
              key={character.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`lineup-character-card ${
                selected ? 'lineup-character-card--selected' : ''
              }`}
              onClick={() => onSelectCharacter(character.id)}
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
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder="SUNNY"
          maxLength={nicknameMaxLength}
          autoComplete="off"
        />
      </div>

      <button
        type="button"
        className="project-cta project-cta--primary lineup-game__start"
        disabled={!canEnter}
        onClick={onEnter}
      >
        Enter The Lineup
      </button>
    </>
  )
}

export default LineupCharacterSelect
