// Character-select and gameplay art for The Lineup, kept separate from
// LineupGame.tsx the same way projects.ts is kept separate from the
// components that render it — nothing in the game component needs to
// change if a portrait/sprite path or a character's label changes.
const BASE = import.meta.env.BASE_URL
const PORTRAITS = `${BASE}images/lineup/portraits`
const SPRITES = `${BASE}images/lineup/sprites`

export interface LineupCharacterSprites {
  wait: string
  paddle: string
  ride: string
  wipeout: string
}

export interface LineupCharacter {
  id: string
  label: string
  portrait: string
  sprites: LineupCharacterSprites
}

// No names exist anywhere in the codebase or assets for these four
// surfers, so they're labeled generically (SURFER 01-04) rather than
// invented. Sprites aren't rendered anywhere yet (see LineupGame.tsx) —
// this mapping just establishes where each pose lives for when gameplay
// lands in a later TOP TURN.
export const LINEUP_CHARACTERS: LineupCharacter[] = [
  {
    id: 'surfer01',
    label: 'SURFER 01',
    portrait: `${PORTRAITS}/surfer-01.png`,
    sprites: {
      wait: `${SPRITES}/surfer01-wait.png`,
      paddle: `${SPRITES}/surfer01-paddle.png`,
      ride: `${SPRITES}/surfer01-ride.png`,
      wipeout: `${SPRITES}/surfer01-wipeout.png`,
    },
  },
  {
    id: 'surfer02',
    label: 'SURFER 02',
    portrait: `${PORTRAITS}/surfer-02.png`,
    sprites: {
      wait: `${SPRITES}/surfer02-wait.png`,
      paddle: `${SPRITES}/surfer02-paddle.png`,
      ride: `${SPRITES}/surfer02-ride.png`,
      wipeout: `${SPRITES}/surfer02-wipeout.png`,
    },
  },
  {
    id: 'surfer03',
    label: 'SURFER 03',
    portrait: `${PORTRAITS}/surfer-03.png`,
    sprites: {
      wait: `${SPRITES}/surfer03-wait.png`,
      paddle: `${SPRITES}/surfer03-paddle.png`,
      ride: `${SPRITES}/surfer03-ride.png`,
      wipeout: `${SPRITES}/surfer03-wipeout.png`,
    },
  },
  {
    id: 'surfer04',
    label: 'SURFER 04',
    portrait: `${PORTRAITS}/surfer-04.png`,
    sprites: {
      wait: `${SPRITES}/surfer04-wait.png`,
      paddle: `${SPRITES}/surfer04-paddle.png`,
      ride: `${SPRITES}/surfer04-ride.png`,
      wipeout: `${SPRITES}/surfer04-wipeout.png`,
    },
  },
]
