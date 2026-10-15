import type { GridPosition } from '../../types/pathfinding';

/**
 * The route an air creep flies: the octile direct line from the entrance
 * anchor to the exit anchor, one anchor cell per step, ignoring every tower.
 * Diagonal steps come first while both axes still differ, then the straight
 * remainder, so the line hugs the geometric straight line and never bends
 * around occupancy. Deterministic and allocation-light: computed once per
 * wave together with the ground routes.
 */
export function calculateAirRoute(entrance: GridPosition, exit: GridPosition): GridPosition[] {
  const route: GridPosition[] = [{ x: entrance.x, y: entrance.y }];
  let x = entrance.x;
  let y = entrance.y;

  while (x !== exit.x || y !== exit.y) {
    x += Math.sign(exit.x - x);
    y += Math.sign(exit.y - y);
    route.push({ x, y });
  }

  return route;
}
