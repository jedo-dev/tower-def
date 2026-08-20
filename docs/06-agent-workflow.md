# Agent Workflow

This project uses Beads (`bd`) as the source of truth for task planning and
execution.

## Core rule

Always start from Beads. Before doing any implementation work, run:

```bash
bd ready
```

Pick the highest-priority ready task.

## One task at a time

Work on only one Beads task at a time. Do not start another task until the
current task is completed.

## Starting work

When starting a task, run:

```bash
bd update <task-id> --status in_progress
```

Then read:

- `AGENTS.md`
- `docs/00-vision.md`
- `docs/01-game-design-brief.md`
- `docs/02-mvp-scope.md`
- `docs/03-backlog.md`
- `docs/04-decisions.md`

## Finishing work

When the task is complete:

```bash
bd close <task-id> --reason "what was verified"
```

## Scope discipline

- Do not implement features outside the selected Beads task.
- If a new required task is discovered, create or propose a new Beads task
  instead of implementing it silently.

## Project-specific rules

- React is used for app shell, menus, HUD, and UI.
- Phaser is used for the game scene, rendering, game loop, input, movement,
  targeting, and effects.
- Do not drive frame-by-frame game logic through React state.
- Keep Phaser logic isolated from React UI (typed bridge only).
- Use TypeScript. Prefer small pure functions for grid, pathfinding, waves,
  economy, and combat.
- Prioritize gameplay correctness over visuals.

## MVP restrictions

Do not implement yet unless a Beads task explicitly says so:

- Multiplayer
- Backend
- Crypto/WebRTC mechanics
- Save system
- Complex tower upgrade branches
- Resistances
- Full pixel-art creature roster
- Advanced animations
- Telegram Web App integration

## If requirements are unclear

Do not guess. Stop and ask for clarification.

## Commit discipline

Keep commits aligned with Beads task boundaries when possible. Commit format:

```bash
git commit -m "tower-def-xxx: implement short task description"
```

## Goal

Use Beads to move the project from idea to playable MVP in small, controlled
steps. Beads is the plan. Docs are the source of product truth. Code follows
both.
