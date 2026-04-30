# MVP Scope

## Goal

Create a playable single-player Tower Defense prototype with correct core mechanics.

## MVP must include

- React + Vite project.
- Phaser game embedded into React.
- 10 x 15 grid.
- Entrance and exit cells.
- Build phase.
- Wave phase.
- One basic creep type.
- One basic tower type.
- Tower placement preview:
  - green = valid
  - red = invalid
- Pathfinding check before tower placement.
- Creeps follow path from entrance to exit.
- Towers attack creeps.
- Gold for kills.
- Lives lost when creeps reach exit.
- Basic win/loss loop.

## MVP can skip

- Multiplayer.
- Backend.
- Save system.
- Advanced UI.
- Complex animations.
- Multiple maps.
- Tower modifiers.
- Resistances.
- Bosses.
- Full pixel-art asset pipeline.

## First playable target

A player should be able to:

1. Open the game.
2. See a 10 x 15 map.
3. Place towers between waves.
4. Start a wave.
5. Watch creeps move along the path.
6. See towers attack.
7. Earn gold.
8. Lose lives if creeps escape.
