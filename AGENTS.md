# AGENTS.md

## Project

Mobile-first Tower Defense game inspired by Warcraft 3 custom TD maps.

## Tech direction

- Use React + Vite for app shell, menus, HUD, routing.
- Use Phaser for the actual game scene, canvas rendering, game loop, movement, targeting, and effects.
- Keep React and Phaser responsibilities separated.
- Do not drive per-frame game logic through React state.

## MVP constraints

- Grid size: 10 columns x 15 rows.
- Build phase only between waves.
- Player cannot place towers if it blocks the only path.
- Pathfinding is required before confirming tower placement.
- First version should prioritize gameplay correctness over visuals.

## Code style

- TypeScript preferred.
- Keep game logic modular and testable.
- Avoid large god-objects.
- Prefer small pure functions for grid, pathfinding, waves, and economy.
- Document important decisions in `/docs/04-decisions.md`.

## Before changing architecture

Update or propose changes to:

- `/docs/01-game-design-brief.md`
- `/docs/02-mvp-scope.md`
- `/docs/04-decisions.md`

## Do not implement yet

- Multiplayer
- Backend
- Crypto/WebRTC mechanics
- Complex tower branches
- Resistances
- Full Warcraft-like creature roster

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
