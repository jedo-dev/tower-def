import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import type { GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_LANE_WIDTH, MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH } from './constants';
import {
  createWallCandidates,
  findNeighborWalls,
  getWallLine,
  isDiagonalWall,
  type EndpointZone,
  type WallCandidate,
  type WallSiteView,
} from './wallCandidates';

const { cols, rows } = GRID_DIMENSIONS;
const BLOCK = TOWER_FOOTPRINT.width;

/** A board with nothing on it but the given tower blocks. */
function createView(blocks: readonly GridPoint[] = []): WallSiteView {
  const blocked = new Set<string>();
  for (const block of blocks) {
    for (let y = block.y; y < block.y + BLOCK; y += 1) {
      for (let x = block.x; x < block.x + BLOCK; x += 1) {
        blocked.add(`${x}:${y}`);
      }
    }
  }
  const isObstacle = (x: number, y: number) =>
    x < 0 || y < 0 || x >= cols || y >= rows || blocked.has(`${x}:${y}`);
  return {
    cols,
    rows,
    isObstacle,
    canPlace: (anchor) =>
      anchor.x >= 0 &&
      anchor.y >= 0 &&
      anchor.x + BLOCK <= cols &&
      anchor.y + BLOCK <= rows &&
      [0, 1].every((dy) => [0, 1].every((dx) => !isObstacle(anchor.x + dx, anchor.y + dy))),
  };
}

function isWall(wall: WallCandidate, dx: number, dy: number, start: GridPoint): boolean {
  return (
    wall.direction.x === dx &&
    wall.direction.y === dy &&
    wall.start.x === start.x &&
    wall.start.y === start.y
  );
}

describe('computer-opponent/maze-planning/wallCandidates', () => {
  const candidates = createWallCandidates(createView());

  it('runs a straight wall from its edge to exactly a large-creep lane at the far edge', () => {
    const fromLeft = candidates.filter((wall) => isWall(wall, 1, 0, { x: 0, y: wall.start.y }));
    const fromBottom = candidates.filter((wall) =>
      isWall(wall, 0, -1, { x: wall.start.x, y: rows - BLOCK }),
    );

    expect(fromLeft.length).toBeGreaterThan(0);
    expect(fromBottom.length).toBeGreaterThan(0);
    for (const wall of fromLeft) {
      const last = wall.anchors[wall.anchors.length - 1];
      expect(cols - (last.x + BLOCK)).toBe(MAZE_PLAN_LANE_WIDTH);
    }
    for (const wall of fromBottom) {
      expect(wall.anchors[wall.anchors.length - 1].y).toBe(MAZE_PLAN_LANE_WIDTH);
    }
  });

  it('leaves no one-cell gap between a wall and an edge it runs along', () => {
    const lines = new Set(
      candidates.filter((wall) => isWall(wall, 1, 0, { x: 0, y: wall.start.y })).map(getWallLine),
    );

    expect(lines.has(0)).toBe(true);
    expect(lines.has(1)).toBe(false);
    expect(lines.has(rows - BLOCK - 1)).toBe(false);
    expect(lines.has(rows - BLOCK)).toBe(true);
  });

  it('chains diagonal walls corner to corner until a lane is left', () => {
    const diagonal = candidates.find((wall) => isWall(wall, 1, 1, { x: 0, y: 10 }));

    expect(diagonal).toBeDefined();
    const anchors = diagonal?.anchors ?? [];
    anchors.slice(1).forEach((anchor, index) => {
      expect(anchor).toEqual({ x: anchors[index].x + BLOCK, y: anchors[index].y + BLOCK });
    });
    const last = anchors[anchors.length - 1];
    // Stopped because one block more would come within a lane of the far edge.
    expect(Math.min(cols - (last.x + BLOCK), rows - (last.y + BLOCK))).toBeGreaterThanOrEqual(
      MAZE_PLAN_LANE_WIDTH,
    );
    expect(Math.min(cols - (last.x + 2 * BLOCK), rows - (last.y + 2 * BLOCK))).toBeLessThan(
      MAZE_PLAN_LANE_WIDTH,
    );
    expect(isDiagonalWall(diagonal as WallCandidate)).toBe(true);
  });

  it('branches walls off the faces of standing blocks, not only off edges', () => {
    // A column wall from the top edge down to row 15.
    const column = Array.from({ length: 8 }, (_, index) => ({ x: 6, y: index * BLOCK }));
    const branched = createWallCandidates(createView(column));
    const tooth = branched.find((wall) => isWall(wall, 1, 0, { x: 8, y: 10 }));
    const below = branched.find((wall) => isWall(wall, 0, 1, { x: 6, y: 16 }));

    expect(tooth?.anchors.map((anchor) => anchor.x)).toEqual([8, 10, 12, 14, 16]);
    expect(below?.anchors[below.anchors.length - 1].y).toBe(rows - BLOCK - MAZE_PLAN_LANE_WIDTH);
    // Nothing starts in open floor, away from every edge and block.
    expect(branched.some((wall) => isWall(wall, 1, 0, { x: 12, y: 20 }))).toBe(false);
  });

  it('leaves out straight walls that squeeze an endpoint into a strip along the edge', () => {
    // Entrance on the bottom edge, exit on the left edge.
    const zones: EndpointZone[] = [
      { anchor: { x: 11, y: rows - 2 }, footprint: { width: 2, height: 2 } },
      { anchor: { x: 0, y: 12 }, footprint: { width: 2, height: 2 } },
    ];
    const filtered = createWallCandidates(createView(), zones);
    const lines = (horizontal: boolean) =>
      new Set(
        filtered
          .filter((wall) => !isDiagonalWall(wall) && (wall.direction.y === 0) === horizontal)
          .map(getWallLine),
      );

    for (let index = 0; index < MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH - 1; index += 1) {
      expect(lines(true).has(rows - BLOCK - 2 - index), `row ${index}`).toBe(false);
      expect(lines(false).has(2 + index), `column ${index}`).toBe(false);
    }
    // One line further out the strip is wide enough to be a room, not a lane.
    expect(lines(true).has(rows - BLOCK - MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH - 1)).toBe(true);
    expect(lines(false).has(MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH + 1)).toBe(true);
    expect(filtered.filter(isDiagonalWall)).toEqual(candidates.filter(isDiagonalWall));
  });

  it('finds the walls one line either side running the same way', () => {
    const wall = candidates.find((candidate) => isWall(candidate, 1, 0, { x: 0, y: 10 }));
    const neighbors = wall ? findNeighborWalls(candidates, wall) : [];

    expect(neighbors.map(getWallLine)).toEqual([9, 11]);
    expect(neighbors.every((neighbor) => neighbor.direction === wall?.direction)).toBe(true);
  });
});
