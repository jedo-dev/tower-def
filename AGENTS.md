# AGENTS.md

## Project

Mobile-first Tower Defense game inspired by Warcraft 3 custom TD maps.

Single-player MVP built in browser (PWA / Telegram Web App ready), with future expansion to multiplayer.

---

## Tech Stack

- React + Vite
- TypeScript (strict mode)
- Phaser (game engine)
- Feature-Sliced Design (FSD)

---

## Architecture Principles

### Separation of concerns (CRITICAL)

- React = UI layer (HUD, menus, controls)
- Phaser = game engine (rendering, game loop, entities, logic)

❌ Do NOT:

- Drive game loop via React state
- Mix Phaser logic inside React components

---

## FSD Structure (MANDATORY)

```txt
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/

```

Layer rules
shared → utils, types, constants
entities → game domain (creep, tower, grid)
features → user actions (build tower, start wave)
widgets → UI blocks (HUD, panels)
pages → screens
app → entrypoint, providers

❌ Do NOT:

Import from upper layers
Create cross-layer dependencies
Put business logic in widgets or pages

TypeScript Rules (STRICT)
General
strict: true
No any (except extremely justified cases)
Prefer unknown over any
Typing discipline
Every domain entity must have explicit types
Use type or interface consistently
Avoid implicit inference for complex objects
Enums & Constants (MANDATORY)

All config values must be centralized.

export enum GridConfig {
COLS = 10,
ROWS = 15,
}

export enum GameBalance {
START_GOLD = 100,
BASE_LIVES = 20,
}

Reason:

future i18n
balancing
maintainability
Code Quality Rules
File size
Max ~300 lines per file
Split aggressively
Functions
Prefer pure functions
Avoid side effects
Keep functions small and composable
Naming
No abbreviations
Self-explanatory names
Domain-first naming
Game Architecture
Grid System

Each cell must be explicitly modeled:

type GridCell = {
x: number
y: number
isWalkable: boolean
isOccupied: boolean
}
Pathfinding
Must be deterministic
Must be isolated from rendering
Must be testable

Required:

Validate path before tower placement
Reject invalid builds
Game Loop

Handled ONLY by Phaser.

React must NOT:

update per frame
store runtime entity state
Beads Workflow (MANDATORY)

This project uses Beads (bd) as the task source of truth.

Start work
bd ready
bd start <task-id>
Finish work
bd done <task-id>
bd sync
Scope Discipline
Do NOT implement anything outside the selected task
Do NOT extend scope silently
If something is missing → create a new Beads task
Docs to Read Before Coding
/docs/00-vision.md
/docs/01-game-design-brief.md
/docs/02-mvp-scope.md
/docs/03-backlog.md
/docs/04-decisions.md
/docs/06-agent-workflow.md
MVP Restrictions

Do NOT implement yet:

Multiplayer
Backend
Crypto/WebRTC
Save system
Advanced UI
Tower modifiers
Resistances
Boss logic
Asset pipeline
Animations
If Requirements Are Unclear

Stop.
Do NOT guess.
Ask for clarification.

Commit Rules

Align commits with Beads tasks:

git commit -m "tower-def-xxx: short description"
Engineering Mindset
Think in systems, not features
Design for extensibility
Avoid hacks, even in MVP
Build minimal, but correct
Prefer clarity over cleverness
Goal

Deliver a clean, extensible, production-grade MVP foundation for a Tower Defense game.

Beads = tasks
Docs = product truth
Code = implementation
