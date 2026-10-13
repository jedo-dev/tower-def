import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { MAZE_PLAN_LANE_WIDTH } from './constants';
import { createWallCandidates, findNeighborWalls } from './wallCandidates';

const { cols, rows } = GRID_DIMENSIONS;

describe('computer-opponent/maze-planning/wallCandidates', () => {
  const candidates = createWallCandidates(cols, rows);

  it('offers a wall from each edge along every tower row and column', () => {
    const rowWalls = candidates.filter((wall) => wall.axis === 'row');
    const columnWalls = candidates.filter((wall) => wall.axis === 'column');

    expect(rowWalls).toHaveLength((rows - TOWER_FOOTPRINT.height + 1) * 2);
    expect(columnWalls).toHaveLength((cols - TOWER_FOOTPRINT.width + 1) * 2);
  });

  it('runs from its edge and leaves exactly a large-creep lane at the far end', () => {
    for (const wall of candidates) {
      const size = wall.axis === 'row' ? cols : rows;
      const along = wall.anchors.map((anchor) => (wall.axis === 'row' ? anchor.x : anchor.y));
      const first = along[0];
      const last = along[along.length - 1];

      if (wall.fromLowEdge) {
        expect(first).toBe(0);
        expect(size - (last + TOWER_FOOTPRINT.width)).toBe(MAZE_PLAN_LANE_WIDTH);
      } else {
        expect(first + TOWER_FOOTPRINT.width).toBe(size);
        expect(last).toBe(MAZE_PLAN_LANE_WIDTH);
      }
    }
  });

  it('finds the walls one line either side on the same edge', () => {
    const wall = candidates.find((c) => c.axis === 'row' && c.line === 10 && c.fromLowEdge);
    const neighbors = wall ? findNeighborWalls(candidates, wall) : [];

    expect(neighbors.map((neighbor) => neighbor.line)).toEqual([9, 11]);
    expect(neighbors.every((neighbor) => neighbor.fromLowEdge && neighbor.axis === 'row')).toBe(
      true,
    );
  });
});
