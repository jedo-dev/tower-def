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

## Decision 007: Builder factions are config-driven

Builder factions and their buildable towers are defined via typed config models.

For MVP testing, each faction starts with one archer-type starter tower.

## Decision 008: Lint with oxlint instead of ESLint

Linting runs through oxlint (`npm run lint`), configured in `.oxlintrc.json`.
ESLint, typescript-eslint and the React ESLint plugins were removed.

The config is a port of the former ESLint setup: ESLint recommended,
typescript-eslint recommended (including its overrides that turn off core rules
TypeScript already checks, such as `no-redeclare`), React hooks rules
(`rules-of-hooks`, `exhaustive-deps` and the React Compiler rules) and
`only-export-components` for Vite fast refresh.

Reason:

oxlint is part of the Oxc toolchain, is much faster than ESLint, and ships the
TypeScript and React rules natively, so the project needs a single lint
dependency instead of six.

## Decision 009: Format with oxfmt

Code is formatted with oxfmt (`npm run format`, checked by `npm run format:check`),
configured in `.oxfmtrc.json`: single quotes, semicolons, trailing commas,
print width 100, LF line endings. Markdown, docs, public assets and tool output
are not formatted. `.gitattributes` forces LF in the working tree so the format
check gives the same result on Windows and Unix.

Reason:

oxfmt is the Oxc formatter (Prettier-compatible output, much faster) and pairs
with oxlint. The options were chosen to match the dominant existing style so
the one-time reformat stays small.
