# Technical & Product Decisions

## Decision 001: Use Phaser for game loop

React will be used for app shell and UI.

Phaser will be used for:

- Rendering game scene.
- Game loop.
- Creeps movement.
- Tower attacks.
- Effects.
- Input on the game field.

Reason:

Tower Defense requires frame-based updates and many moving objects. Phaser is better suited for this than React state updates.

## Decision 002: Mobile-first

The game is designed primarily for mobile screens.

Reason:

The main target platforms are PWA and Telegram Web App.

## Decision 003: Grid-based map

The map uses a grid.

Reason:

Tower placement, pathfinding, blocking checks, and mobile interactions are easier and more predictable on a grid.

## Decision 004: Initial grid size is 10 x 15

Reason:

This size should fit mobile screens while still allowing maze-building.

## Decision 005: Building only between waves

Reason:

This simplifies pathfinding, prevents mid-wave path chaos, and matches the intended gameplay pacing.

## Decision 006: Path is checked before placement

Reason:

The player must never be allowed to fully block the creep path.
