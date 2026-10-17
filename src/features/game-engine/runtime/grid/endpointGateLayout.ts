import {
  TERRAIN_GATE_SHEET,
  TERRAIN_GATE_SHEET_COLUMN_BY_EDGE,
  TERRAIN_GATE_SHEET_ROW_BY_ROLE,
  type BoardEdge,
  type GateRole,
} from '../../../../shared/constants/terrain';
import type { Footprint, GridPoint } from '../../../../shared/types/grid';

/** An entrance or exit zone: its top-left anchor cell and size, in cells. */
export type GateZone = {
  readonly anchor: GridPoint;
  readonly footprint: Readonly<Footprint>;
};

export type GateBoardSize = {
  readonly cols: number;
  readonly rows: number;
};

/** Where a gate is drawn, in world units: origin at the structure's base centre. */
export type GatePlacement = {
  readonly x: number;
  readonly y: number;
  readonly displaySize: number;
};

/** Edges in a stable order: sides before top/bottom only matters for ties. */
const BOARD_EDGES: readonly BoardEdge[] = ['left', 'right', 'top', 'bottom'];

const OPPOSITE_EDGE: Readonly<Record<BoardEdge, BoardEdge>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Sheet frame index of a gate: row by role, column by the edge it stands on. */
export function resolveGateFrameIndex(role: GateRole, edge: BoardEdge): number {
  return (
    TERRAIN_GATE_SHEET_ROW_BY_ROLE[role] * TERRAIN_GATE_SHEET.columns +
    TERRAIN_GATE_SHEET_COLUMN_BY_EDGE[edge]
  );
}

/** Every board edge the zone touches: one on a side, two in a corner. */
export function listTouchedBoardEdges(zone: GateZone, board: GateBoardSize): BoardEdge[] {
  const { anchor, footprint } = zone;
  const touches: Readonly<Record<BoardEdge, boolean>> = {
    left: anchor.x <= 0,
    right: anchor.x + footprint.width >= board.cols,
    top: anchor.y <= 0,
    bottom: anchor.y + footprint.height >= board.rows,
  };
  return BOARD_EDGES.filter((edge) => touches[edge]);
}

function isInsideZone(point: GridPoint, zone: GateZone): boolean {
  return (
    point.x >= zone.anchor.x &&
    point.x < zone.anchor.x + zone.footprint.width &&
    point.y >= zone.anchor.y &&
    point.y < zone.anchor.y + zone.footprint.height
  );
}

/**
 * The route cell just outside the zone: the first one after the entrance, or
 * the last one before the exit. Null when the route never leaves the zone.
 */
function findRouteCellBesideZone(
  role: GateRole,
  zone: GateZone,
  route: readonly GridPoint[],
): GridPoint | null {
  const step = role === 'entrance' ? 1 : -1;
  for (
    let index = role === 'entrance' ? 0 : route.length - 1;
    index >= 0 && index < route.length;
    index += step
  ) {
    if (!isInsideZone(route[index], zone)) {
      return route[index];
    }
  }
  return null;
}

/** Which side of the zone a neighbouring cell lies on. */
function sideOfZone(point: GridPoint, zone: GateZone): BoardEdge {
  if (point.x < zone.anchor.x) return 'left';
  if (point.x >= zone.anchor.x + zone.footprint.width) return 'right';
  if (point.y < zone.anchor.y) return 'top';
  return 'bottom';
}

/** The touched edge whose gate opens most towards `target` (a corner without a route). */
function edgeFacing(touched: readonly BoardEdge[], zone: GateZone, target: GridPoint): BoardEdge {
  const horizontal = touched.find((edge) => edge === 'left' || edge === 'right');
  const vertical = touched.find((edge) => edge === 'top' || edge === 'bottom');
  if (!horizontal || !vertical) {
    return touched[0];
  }
  const deltaX = Math.abs(target.x - zone.anchor.x);
  const deltaY = Math.abs(target.y - zone.anchor.y);
  return deltaX >= deltaY ? horizontal : vertical;
}

export type ResolveGateEdgeParams = {
  readonly role: GateRole;
  readonly zone: GateZone;
  readonly board: GateBoardSize;
  /** The shown creep route, entrance to exit; may be empty. */
  readonly route: readonly GridPoint[];
  /** The other endpoint's anchor: breaks a corner tie when there is no route. */
  readonly otherAnchor: GridPoint;
};

/**
 * The board edge a gate stands on. A zone on one edge takes that edge. A
 * corner zone takes the edge the route passes through it by: the gate's
 * opening faces the side the route leaves (entrance) or arrives from (exit),
 * so the gate stands on the opposite edge. Without a usable route the gate
 * opens towards the other endpoint. A zone touching no edge falls back to the
 * nearest edge, so an odd map still shows a gate.
 */
export function resolveGateEdge(params: ResolveGateEdgeParams): BoardEdge {
  const { role, zone, board, route, otherAnchor } = params;
  const touched = listTouchedBoardEdges(zone, board);
  if (touched.length === 1) {
    return touched[0];
  }
  if (touched.length === 0) {
    return nearestBoardEdge(zone, board);
  }

  const besideCell = findRouteCellBesideZone(role, zone, route);
  if (besideCell) {
    const routeEdge = OPPOSITE_EDGE[sideOfZone(besideCell, zone)];
    if (touched.includes(routeEdge)) {
      return routeEdge;
    }
  }
  return edgeFacing(touched, zone, otherAnchor);
}

function nearestBoardEdge(zone: GateZone, board: GateBoardSize): BoardEdge {
  const distances: Readonly<Record<BoardEdge, number>> = {
    left: zone.anchor.x,
    right: board.cols - (zone.anchor.x + zone.footprint.width),
    top: zone.anchor.y,
    bottom: board.rows - (zone.anchor.y + zone.footprint.height),
  };
  return BOARD_EDGES.reduce((nearest, edge) =>
    distances[edge] < distances[nearest] ? edge : nearest,
  );
}

/**
 * The gate is drawn at the 2x2 footprint size, centred on the zone: on a 2x2
 * zone its base sits on the zone's lower edge and it covers the zone exactly;
 * a 1-cell opening gets the same size, centred on that cell.
 */
export function computeGatePlacement(zone: GateZone, cellSize: number): GatePlacement {
  const displaySize = TERRAIN_GATE_SHEET.displaySizeCells * cellSize;
  return {
    x: (zone.anchor.x + zone.footprint.width / 2) * cellSize,
    y: (zone.anchor.y + zone.footprint.height / 2) * cellSize + displaySize / 2,
    displaySize,
  };
}
