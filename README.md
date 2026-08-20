# Tower Def

A Warcraft 3–inspired tower defense duel for mobile web. Build mazes of towers
to defend your lane, or invest gold into sending creeps at your opponent to
grow your income — classic WC3 custom-map economics against a computer
opponent.

## Stack

- React 19 + TypeScript (strict) + Vite
- Phaser 4 for the game loop and rendering
- Feature-Sliced Design (`app` / `pages` / `widgets` / `features` / `entities` / `shared`)
- Typed React↔Phaser bridge (`src/shared/lib/game-bridge`) — React never touches the scene directly
- Vitest (unit tests over pure domain logic)

## Development

```bash
npm install
npm run dev        # Vite dev server
npx vitest run     # test suite
npx tsc --noEmit -p tsconfig.app.json   # typecheck
```

## Project docs

- `docs/00-vision.md` — vision and long-term goals
- `docs/01-game-design-brief.md` — game design brief
- `docs/07-duel-mode-expansion-plan.md` — duel mode roadmap
- `AGENTS.md` — engineering rules (FSD boundaries, bridge contract, testing)

## Task tracking

Issues live in [beads](https://github.com/steveyegge/beads) (`.beads/`):

```bash
bd ready     # what is unblocked
bd show <id> # task details
```

Commit format: `tower-def-<issue-id>: description`.
