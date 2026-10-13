import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { MAZE_PLAN_LANE_WIDTH, MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH } from './constants';
import { createWallCandidates, findNeighborWalls, type EndpointZone } from './wallCandidates';

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

  it('leaves out walls that squeeze an endpoint into a strip along the edge', () => {
    // Entrance on the bottom edge, exit on the left edge.
    const zones: EndpointZone[] = [
      { anchor: { x: 11, y: rows - 2 }, footprint: { width: 2, height: 2 } },
      { anchor: { x: 0, y: 12 }, footprint: { width: 2, height: 2 } },
    ];
    const filtered = createWallCandidates(cols, rows, zones);
    const lines = (axis: 'row' | 'column') =>
      new Set(filtered.filter((wall) => wall.axis === axis).map((wall) => wall.line));
    const stripRowLines = Array.from(
      { length: MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH - 1 },
      (_, index) => rows - TOWER_FOOTPRINT.height - 2 - index,
    );
    const stripColumnLines = Array.from(
      { length: MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH - 1 },
      (_, index) => 2 + index,
    );

    for (const line of stripRowLines) {
      expect(lines('row').has(line), `row ${line}`).toBe(false);
    }
    for (const line of stripColumnLines) {
      expect(lines('column').has(line), `column ${line}`).toBe(false);
    }
    // One line further out the strip is wide enough to be a room, not a lane.
    expect(
      lines('row').has(rows - TOWER_FOOTPRINT.height - MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH - 1),
    ).toBe(true);
    expect(lines('column').has(MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH + 1)).toBe(true);
    // Walls along the other axis do not run along those edges and all stay.
    expect(filtered.length).toBe(
      candidates.length - 2 * (stripRowLines.length + stripColumnLines.length),
    );
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
