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
  // TOP TURN 08.4: a dedicated rear-view pose for the paddle-out-surfer
  // NPC only — never used for the player or for priority-NPC paddling,
  // which both keep the regular `paddle` (facing-camera) pose. See
  // LineupGame.tsx's beginWave/schedulePaddleTransition for where each is
  // actually chosen.
  paddleout: string
  ride: string
  wipeout: string
}

export interface LineupCharacter {
  id: string
  // TOP TURN 09: the character's given name (LUA, KAI, FINN, SUNNY) — the
  // primary label everywhere a player picks or plays as this surfer.
  // `label` (SURFER 01-04) stays as secondary/generic metadata rather
  // than being replaced, since it's still useful shorthand (e.g. the
  // pose guide's fixed "SURFER 01" example) independent of naming.
  name: string
  label: string
  portrait: string
  sprites: LineupCharacterSprites
}

// TOP TURN 09 gives these four surfers names (LUA, KAI, FINN, SUNNY) —
// read everywhere from this one place (character-select, the pose guide)
// rather than hardcoded per component. `label` (SURFER 01-04) remains as
// secondary metadata alongside the name.
export const LINEUP_CHARACTERS: LineupCharacter[] = [
  {
    id: 'surfer01',
    name: 'LUA',
    label: 'SURFER 01',
    portrait: `${PORTRAITS}/surfer-01.png`,
    sprites: {
      wait: `${SPRITES}/surfer01-wait.png`,
      paddle: `${SPRITES}/surfer01-paddle.png`,
      paddleout: `${SPRITES}/surfer01-paddleout.png`,
      ride: `${SPRITES}/surfer01-ride.png`,
      wipeout: `${SPRITES}/surfer01-wipeout.png`,
    },
  },
  {
    id: 'surfer02',
    name: 'KAI',
    label: 'SURFER 02',
    portrait: `${PORTRAITS}/surfer-02.png`,
    sprites: {
      wait: `${SPRITES}/surfer02-wait.png`,
      paddle: `${SPRITES}/surfer02-paddle.png`,
      paddleout: `${SPRITES}/surfer02-paddleout.png`,
      ride: `${SPRITES}/surfer02-ride.png`,
      wipeout: `${SPRITES}/surfer02-wipeout.png`,
    },
  },
  {
    id: 'surfer03',
    name: 'FINN',
    label: 'SURFER 03',
    portrait: `${PORTRAITS}/surfer-03.png`,
    sprites: {
      wait: `${SPRITES}/surfer03-wait.png`,
      paddle: `${SPRITES}/surfer03-paddle.png`,
      paddleout: `${SPRITES}/surfer03-paddleout.png`,
      ride: `${SPRITES}/surfer03-ride.png`,
      wipeout: `${SPRITES}/surfer03-wipeout.png`,
    },
  },
  {
    id: 'surfer04',
    name: 'SUNNY',
    label: 'SURFER 04',
    portrait: `${PORTRAITS}/surfer-04.png`,
    sprites: {
      wait: `${SPRITES}/surfer04-wait.png`,
      paddle: `${SPRITES}/surfer04-paddle.png`,
      paddleout: `${SPRITES}/surfer04-paddleout.png`,
      ride: `${SPRITES}/surfer04-ride.png`,
      wipeout: `${SPRITES}/surfer04-wipeout.png`,
    },
  },
]
