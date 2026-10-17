import { describe, expect, it } from 'vitest';
import type { GridPoint } from '../../../../shared/types/grid';
import {
  computeGatePlacement,
  listTouchedBoardEdges,
  resolveGateEdge,
  resolveGateFrameIndex,
  type GateZone,
} from './endpointGateLayout';

const BOARD = { cols: 20, rows: 30 };
const ZONE_2X2 = { width: 2, height: 2 };
const CELL = { width: 1, height: 1 };

const zone = (x: number, y: number, footprint = ZONE_2X2): GateZone => ({
  anchor: { x, y },
  footprint,
});

describe('resolveGateFrameIndex', () => {
  it('picks the row by role and the column by edge (top, right, bottom, left)', () => {
    expect(resolveGateFrameIndex('entrance', 'top')).toBe(0);
    expect(resolveGateFrameIndex('entrance', 'right')).toBe(1);
    expect(resolveGateFrameIndex('entrance', 'bottom')).toBe(2);
    expect(resolveGateFrameIndex('entrance', 'left')).toBe(3);
    expect(resolveGateFrameIndex('exit', 'top')).toBe(4);
    expect(resolveGateFrameIndex('exit', 'right')).toBe(5);
    expect(resolveGateFrameIndex('exit', 'bottom')).toBe(6);
    expect(resolveGateFrameIndex('exit', 'left')).toBe(7);
  });
});

describe('listTouchedBoardEdges', () => {
  it('finds the single edge of a cell on each side', () => {
    expect(listTouchedBoardEdges(zone(7, 0, CELL), BOARD)).toEqual(['top']);
    expect(listTouchedBoardEdges(zone(19, 12, CELL), BOARD)).toEqual(['right']);
    expect(listTouchedBoardEdges(zone(7, 29, CELL), BOARD)).toEqual(['bottom']);
    expect(listTouchedBoardEdges(zone(0, 12, CELL), BOARD)).toEqual(['left']);
    expect(listTouchedBoardEdges(zone(5, 5, CELL), BOARD)).toEqual([]);
  });

  it('finds both edges of every corner cell', () => {
    expect(listTouchedBoardEdges(zone(0, 0, CELL), BOARD)).toEqual(['left', 'top']);
    expect(listTouchedBoardEdges(zone(19, 0, CELL), BOARD)).toEqual(['right', 'top']);
    expect(listTouchedBoardEdges(zone(0, 29, CELL), BOARD)).toEqual(['left', 'bottom']);
    expect(listTouchedBoardEdges(zone(19, 29, CELL), BOARD)).toEqual(['right', 'bottom']);
  });

  it('measures a 2x2 zone by its far side', () => {
    expect(listTouchedBoardEdges(zone(18, 14), BOARD)).toEqual(['right']);
    expect(listTouchedBoardEdges(zone(6, 28), BOARD)).toEqual(['bottom']);
    expect(listTouchedBoardEdges(zone(18, 28), BOARD)).toEqual(['right', 'bottom']);
  });
});

describe('resolveGateEdge', () => {
  const edgeOf = (
    role: 'entrance' | 'exit',
    gateZone: GateZone,
    route: GridPoint[] = [],
    otherAnchor: GridPoint = { x: 10, y: 15 },
  ) => resolveGateEdge({ role, zone: gateZone, board: BOARD, route, otherAnchor });

  it('takes the only touched edge on a side, whatever the route does', () => {
    expect(edgeOf('entrance', zone(0, 14), [{ x: 0, y: 13 }])).toBe('left');
    expect(edgeOf('exit', zone(18, 14))).toBe('right');
    expect(edgeOf('entrance', zone(8, 0))).toBe('top');
    expect(edgeOf('exit', zone(8, 28))).toBe('bottom');
  });

  it('stands a corner entrance on the edge opposite the side the route leaves by', () => {
    const corner = zone(0, 0);
    const leavesRight = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const leavesDown = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ];
    expect(edgeOf('entrance', corner, leavesRight)).toBe('left');
    expect(edgeOf('entrance', corner, leavesDown)).toBe('top');
  });

  it('stands a corner exit on the edge the route arrives towards', () => {
    const corner = zone(18, 28);
    const arrivesFromLeft = [
      { x: 16, y: 28 },
      { x: 17, y: 28 },
      { x: 18, y: 28 },
    ];
    const arrivesFromAbove = [
      { x: 18, y: 26 },
      { x: 18, y: 27 },
      { x: 18, y: 28 },
    ];
    expect(edgeOf('exit', corner, arrivesFromLeft)).toBe('right');
    expect(edgeOf('exit', corner, arrivesFromAbove)).toBe('bottom');
  });

  it('opens a corner gate towards the other endpoint without a route', () => {
    expect(edgeOf('entrance', zone(0, 0), [], { x: 18, y: 2 })).toBe('left');
    expect(edgeOf('entrance', zone(0, 0), [], { x: 2, y: 28 })).toBe('top');
  });

  it('falls back to the nearest edge for a zone off every edge', () => {
    expect(edgeOf('entrance', zone(1, 14))).toBe('left');
    expect(edgeOf('exit', zone(9, 27))).toBe('bottom');
  });
});

describe('computeGatePlacement', () => {
  it('stands a 2x2 gate on the lower edge of its zone, covering it', () => {
    expect(computeGatePlacement(zone(0, 14), 16)).toEqual({ x: 16, y: 256, displaySize: 32 });
  });

  it('centres the same-size gate on a 1-cell opening', () => {
    expect(computeGatePlacement(zone(5, 0, CELL), 16)).toEqual({ x: 88, y: 24, displaySize: 32 });
  });
});
