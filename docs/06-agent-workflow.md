# Agent WorkflowThis project uses Beads (`bd`) as the source of truth for task planning and execution.## Core ruleAlways start from Beads.Before doing any implementation work, run:```bashbd ready

Pick the highest-priority ready task.
One task at a time
Work on only one Beads task at a time.
Do not start another task until the current task is completed.
Starting work
When starting a task, run:
bd start <task-id>
Then read:

AGENTS.md

/docs/00-vision.md

/docs/01-game-design-brief.md

/docs/02-mvp-scope.md

/docs/03-backlog.md

/docs/04-decisions.md

Finishing work
When the task is complete:
bd done <task-id>bd sync
If bd sync is unavailable or not configured, explain that in the final response.
Scope discipline
Do not implement features outside the selected Beads task.
If a new required task is discovered, create or propose a new Beads task instead of implementing it silently.
Project-specific rules

React is used for app shell, menus, HUD, and UI.

Phaser is used for the game scene, rendering, game loop, input, movement, targeting, and effects.

Do not drive frame-by-frame game logic through React state.

Keep Phaser logic isolated from React UI.

Use TypeScript.

Prefer small pure functions for grid, pathfinding, waves, economy, and combat.

Prioritize gameplay correctness over visuals.

MVP restrictions
Do not implement yet unless a Beads task explicitly says so:

Multiplayer

Backend

Crypto/WebRTC mechanics

Save system

Complex tower upgrade branches

Resistances

Full pixel-art creature roster

Advanced animations

Telegram Web App integration

If requirements are unclear
Do not guess.
Stop and ask for clarification.
Commit discipline
Keep commits aligned with Beads task boundaries when possible.
Recommended commit format:
git commit -m "tower-def-xxx: implement short task description"
Goal
Use Beads to move the project from idea to playable MVP in small, controlled steps.
Beads is the plan.
Docs are the source of product truth.
Code follows both.
И в конец `AGENTS.md` добавь:```md## WorkflowThis project uses Beads as the task tracker.Before starting implementation, read:- `/docs/06-agent-workflow.md`Agents must select work through `bd ready`, start tasks with `bd start <task-id>`, and close completed tasks with `bd done <task-id>`.
После этого:
git add .git commit -m "docs: add beads agent workflow"
