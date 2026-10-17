import type Phaser from 'phaser';
import { TERRAIN_GATE_ASSETS, type GateRole } from '../../../../shared/constants/terrain';
import type { RaceId } from '../../../../shared/types/content-ids';
import type { Footprint, GridPoint } from '../../../../shared/types/grid';
import {
  computeGatePlacement,
  resolveGateEdge,
  resolveGateFrameIndex,
  type GateBoardSize,
  type GateZone,
} from './endpointGateLayout';

/** Game object name of each gate, for tests and tooling. */
export const ENDPOINT_GATE_OBJECT_NAME: Readonly<Record<GateRole, string>> = {
  entrance: 'endpoint-gate:entrance',
  exit: 'endpoint-gate:exit',
};

/**
 * The entrance and exit gates of the board in view (tower-def-alq). Both
 * battlefields share one board world space, so one pair serves both: like the
 * side scenery, the gates take the race of the field in view. Each image
 * carries `gateRole`, `gateEdge`, `gateRaceId` and `gateFrame` data.
 */
export type EndpointGateLayer = {
  entrance: Phaser.GameObjects.Image | null;
  exit: Phaser.GameObjects.Image | null;
  /** What each gate shows; a sync with the same signature changes nothing. */
  entranceSignature: string | null;
  exitSignature: string | null;
  /** How many times a gate was (re)textured or moved: a test probe. */
  updateCount: number;
};

export type EndpointGateSyncOptions = {
  readonly raceId: RaceId;
  readonly entrance: GridPoint;
  readonly exit: GridPoint;
  readonly footprint: Readonly<Footprint>;
  readonly board: GateBoardSize;
  readonly cellSize: number;
  /** The shown creep route: decides the edge of a corner gate. */
  readonly route: readonly GridPoint[];
  /** Above the trail and ground, below towers and creeps. */
  readonly depth: number;
};

export function createEndpointGateLayer(): EndpointGateLayer {
  return {
    entrance: null,
    exit: null,
    entranceSignature: null,
    exitSignature: null,
    updateCount: 0,
  };
}

function syncGate(
  scene: Phaser.Scene,
  layer: EndpointGateLayer,
  role: GateRole,
  options: EndpointGateSyncOptions,
): void {
  const zone: GateZone = {
    anchor: role === 'entrance' ? options.entrance : options.exit,
    footprint: options.footprint,
  };
  const edge = resolveGateEdge({
    role,
    zone,
    board: options.board,
    route: options.route,
    otherAnchor: role === 'entrance' ? options.exit : options.entrance,
  });
  const frame = resolveGateFrameIndex(role, edge);
  const textureKey = TERRAIN_GATE_ASSETS[options.raceId].key;
  const placement = computeGatePlacement(zone, options.cellSize);
  const signature = `${textureKey}|${frame}|${placement.x}:${placement.y}`;
  const signatureKey = role === 'entrance' ? 'entranceSignature' : 'exitSignature';
  const existing = layer[role];
  if (existing && layer[signatureKey] === signature) {
    return;
  }

  const gate = existing ?? scene.add.image(0, 0, textureKey, frame);
  gate.setName(ENDPOINT_GATE_OBJECT_NAME[role]);
  gate.setTexture(textureKey, frame);
  gate.setOrigin(0.5, 1);
  gate.setPosition(placement.x, placement.y);
  gate.setDisplaySize(placement.displaySize, placement.displaySize);
  gate.setDepth(options.depth);
  // A missing sheet would render Phaser's placeholder box: show nothing instead.
  gate.setVisible(scene.textures.exists(textureKey));
  gate.setData('gateRole', role);
  gate.setData('gateEdge', edge);
  gate.setData('gateRaceId', options.raceId);
  gate.setData('gateFrame', frame);
  layer[role] = gate;
  layer[signatureKey] = signature;
  layer.updateCount += 1;
}

/**
 * Creates the gates on first use and re-frames them when the race in view,
 * the endpoints or a corner gate's route side change; otherwise does nothing.
 * Called on route, view and match changes, never per frame.
 */
export function syncEndpointGates(
  scene: Phaser.Scene,
  layer: EndpointGateLayer,
  options: EndpointGateSyncOptions,
): void {
  syncGate(scene, layer, 'entrance', options);
  syncGate(scene, layer, 'exit', options);
}

export function destroyEndpointGates(layer: EndpointGateLayer): void {
  layer.entrance?.destroy();
  layer.exit?.destroy();
  layer.entrance = null;
  layer.exit = null;
  layer.entranceSignature = null;
  layer.exitSignature = null;
}
