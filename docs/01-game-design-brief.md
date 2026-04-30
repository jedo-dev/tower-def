# Game Design Brief

## Genre

Tower Defense.

## Platform

- Web
- Mobile-first
- Potential targets:
  - PWA
  - Telegram Web App

## Game field

- Grid-based map.
- Initial MVP grid: 10 x 15.
- Entire field should fit on a mobile screen.
- Entrance and exit are defined per level.
- Later, entrance and exit may become randomized.

## Player actions

During build phase, the player can:

- Place towers.
- Upgrade towers.
- Sell towers for 50% of their build cost.
- Start the next wave early.

The player cannot build during an active wave.

## Tower placement rule

A tower blocks its occupied grid cell.

Before confirming tower placement, the game must check whether creeps still have a valid path from entrance to exit.

If the path is blocked, placement is forbidden.

## MVP towers

### Archer Tower

- Single target.
- Basic ranged damage.

### Splash Tower

- Area damage.
- May be delayed until after first MVP if needed.

## Creeps

Creeps have:

- HP
- Speed

Later:

- Armor
- Resistances
- Modifiers
- Boss properties

## Waves

Each wave contains a list of creeps.

Creeps calculate their path once at wave start and then follow it.

## Economy

The player receives gold from:

- Killing creeps.
- Completing waves.
- Starting waves early.

## Lives

If a creep reaches the exit, the player loses life.

If lives reach zero, the game ends in defeat.

## Visual style

Pixel art.

The style should be inspired by Warcraft 3 custom maps, but assets should be original.
