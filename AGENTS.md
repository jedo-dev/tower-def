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

Do NOT:

- Drive game loop via React state
- Mix Phaser logic inside React components

### UI state boundaries (CRITICAL)

- React stores only UI/flow state (`selectedTowerType`, `isPaused`, `activePanel`).
- Phaser stores runtime game state (`creeps`, `projectiles`, `tick`, `waveRuntime`).
- The same state must not be duplicated across React and Phaser.

### React <-> Phaser bridge contract (MANDATORY)

- Use a dedicated adapter layer: `shared/lib/game-bridge`.
- Widgets and pages must not call Phaser scenes directly.
- Use only typed events/commands (`GameEventMap`, `GameCommandMap`), never untyped string event names.
- Bridge code must be testable in isolation from rendering.

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

Layer rules:

- `shared` -> utils, types, constants
- `entities` -> game domain (creep, tower, grid)
- `features` -> user actions (build tower, start wave)
- `widgets` -> UI blocks (HUD, panels)
- `pages` -> screens
- `app` -> entrypoint, providers

Do NOT:

- Import from upper layers
- Create cross-layer dependencies
- Put business logic in widgets or pages

---

## TypeScript Rules (STRICT)

General:

- `strict: true`
- No `any` (except extremely justified cases)
- Prefer `unknown` over `any`

Typing discipline:

- Every domain entity must have explicit types
- Use `type` or `interface` consistently
- Avoid implicit inference for complex objects

---

## Enums & Constants (MANDATORY)

All config values must be centralized.

```ts
export enum GridConfig {
  COLS = 10,
  ROWS = 15,
}

export enum GameBalance {
  START_GOLD = 100,
  BASE_LIVES = 20,
}
```

Reason:

- future i18n
- balancing
- maintainability

---

## Frontend Performance Budget (MANDATORY)

- Target: stable 60 FPS on mid-tier mobile devices.
- React re-renders must be event-driven, not frame-driven.
- Pathfinding, targeting, and wave simulation must run outside React.
- Avoid unnecessary allocations inside gameplay hot paths.

---

## Mobile-First UI Rules (MANDATORY)

- Minimum interactive target size: `44x44`.
- Respect safe areas (`env(safe-area-inset-*)`).
- Required viewport checks: `360x800` and `390x844` in portrait.
- UI must remain usable during orientation change and viewport resize.

---

## Styling Policy

- Use a single styling approach consistently (CSS Modules by default).
- Keep design tokens centralized in `shared/constants/theme`.
- No magic colors/sizes in components.
- Prefer semantic token names over raw values.

---

## Error Handling

- UI must be wrapped with React Error Boundary.
- If Phaser scene crashes, UI must expose recover action (`retry`/`restart run`).
- Errors must be logged through one shared logging entrypoint.

---

## Testing Minimum (MANDATORY)

- Unit: path validation, build rules, economy calculations.
- Integration: bridge events between React and Phaser.
- Smoke: start wave, place tower, lose condition.
- Do not mark task done if required tests are missing or failing.

---

## Accessibility Baseline

- Interactive controls must have clear labels (`aria-label` where needed).
- Pause/speed controls must be keyboard accessible.
- HUD text must meet WCAG AA contrast as baseline.

---

## PWA / Telegram Web App Readiness

- App shell must have offline fallback behavior.
- Handle viewport resize and virtual keyboard overlap safely.
- Keep initial bundle lean; lazy-load non-critical UI blocks.

---

## Code Quality Rules

File size:

- Max ~300 lines per file
- Split aggressively

Functions:

- Prefer pure functions
- Avoid side effects
- Keep functions small and composable

Naming:

- No abbreviations
- Self-explanatory names
- Domain-first naming

---

## Game Architecture

### Grid System

Each cell must be explicitly modeled:

```ts
type GridCell = {
  x: number;
  y: number;
  isWalkable: boolean;
  isOccupied: boolean;
};
```

### Pathfinding

- Must be deterministic
- Must be isolated from rendering
- Must be testable

Required:

- Validate path before tower placement
- Reject invalid builds

### Game Loop

Handled ONLY by Phaser.

React must NOT:

- update per frame
- store runtime entity state

---

## Beads Workflow (MANDATORY)

This project uses Beads (`bd`) as the task source of truth.

Start work:

- `bd ready`
- `bd start <task-id>`

Finish work:

- `bd done <task-id>`
- `bd sync`

---

## Scope Discipline

- Do NOT implement anything outside the selected task
- Do NOT extend scope silently
- If something is missing -> create a new Beads task

If requirements are unclear:

- Stop
- Do NOT guess
- Ask for clarification

---

## Docs to Read Before Coding

- `/docs/00-vision.md`
- `/docs/01-game-design-brief.md`
- `/docs/02-mvp-scope.md`
- `/docs/03-backlog.md`
- `/docs/04-decisions.md`
- `/docs/06-agent-workflow.md`

---

## MVP Restrictions

Do NOT implement yet:

- Multiplayer
- Backend
- Crypto/WebRTC
- Save system
- Advanced UI
- Tower modifiers
- Resistances
- Boss logic
- Asset pipeline
- Animations

---

## Commit Rules

Align commits with Beads tasks:

```bash
git commit -m "tower-def-xxx: short description"
```

---

## Definition of Done (Frontend)

- FSD import rules are respected
- No `any` introduced
- No frame-driven React updates
- Bridge contract remains typed and covered by tests
- Required tests are updated and passing
- Mobile viewport checks completed (`360x800`, `390x844`)

---

## Engineering Mindset

- Think in systems, not features
- Design for extensibility
- Avoid hacks, even in MVP
- Build minimal, but correct
- Prefer clarity over cleverness

---

## Goal

Deliver a clean, extensible, production-grade MVP foundation for a Tower Defense game.

Beads = tasks  
Docs = product truth  
Code = implementation
