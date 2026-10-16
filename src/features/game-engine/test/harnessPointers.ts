import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  worldToScreenPoint,
  type CameraView,
  type ScreenPoint,
} from '../runtime/camera/cameraViewMapping';
import type { FakeSceneSystems } from './fakeSceneSystems';

/**
 * Pointer input for the scene harness: mouse clicks, drags and wheel, touch
 * taps, drags and pinches, emitted on the fake input plugin as the plain
 * pointer shape the scene reads.
 */

type PagePointerGlobals = { window?: unknown; document?: unknown };

/**
 * Pointer mapping reads the canvas' live page offset from `window`/`document`.
 * Node has neither, so a page at scroll 0 is provided for the dispatch only.
 */
function withPagePointerGlobals(run: () => void): void {
  const globals = globalThis as unknown as PagePointerGlobals;
  const missingWindow = globals.window === undefined;
  const missingDocument = globals.document === undefined;
  if (missingWindow) globals.window = { scrollX: 0, scrollY: 0 };
  if (missingDocument) globals.document = { documentElement: { clientLeft: 0, clientTop: 0 } };
  try {
    run();
  } finally {
    if (missingWindow) delete globals.window;
    if (missingDocument) delete globals.document;
  }
}

export type MousePointerOptions = {
  /** 0 left (default), 1 middle, 2 right. */
  button?: number;
  shiftKey?: boolean;
  /** Intermediate pointermove events on a drag. */
  steps?: number;
};

/** The pointer shape the scene reads; the harness never builds a Phaser Pointer. */
type HarnessPointer = {
  id: number;
  x: number;
  y: number;
  wasTouch: boolean;
  button: number;
  primaryDown: boolean;
  event?: { shiftKey: boolean };
};

const MOUSE_POINTER_ID = 0;

export function readCameraView(systems: FakeSceneSystems): CameraView {
  const camera = systems.cameras.main;
  return {
    viewportX: camera.x,
    viewportY: camera.y,
    viewportWidth: camera.width,
    viewportHeight: camera.height,
    zoom: camera.zoom,
    scrollX: camera.scrollX,
    scrollY: camera.scrollY,
  };
}

export function toAnchorScreenPoint(systems: FakeSceneSystems, anchor: GridPosition): ScreenPoint {
  return worldToScreenPoint(
    {
      x: (anchor.x + TOWER_FOOTPRINT.width / 2) * GRID_DIMENSIONS.cellSize,
      y: (anchor.y + TOWER_FOOTPRINT.height / 2) * GRID_DIMENSIONS.cellSize,
    },
    readCameraView(systems),
  );
}

function interpolate(from: ScreenPoint, to: ScreenPoint, progress: number): ScreenPoint {
  return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
}

export function createPointerDispatcher(systems: FakeSceneSystems) {
  const emit = (event: string, pointer: HarnessPointer) =>
    withPagePointerGlobals(() => systems.input.emit(event, pointer));
  const mouse = (screen: ScreenPoint, options: MousePointerOptions, primaryDown: boolean) => ({
    id: MOUSE_POINTER_ID,
    x: screen.x,
    y: screen.y,
    wasTouch: false,
    button: options.button ?? 0,
    primaryDown,
    event: { shiftKey: options.shiftKey ?? false },
  });
  const touch = (screen: ScreenPoint, id: number, primaryDown: boolean): HarnessPointer => ({
    id,
    x: screen.x,
    y: screen.y,
    wasTouch: true,
    button: 0,
    primaryDown,
  });

  return {
    clickAt: (screen: ScreenPoint, options: MousePointerOptions = {}) => {
      emit('pointermove', mouse(screen, options, false));
      emit('pointerdown', mouse(screen, options, true));
      emit('pointerup', mouse(screen, options, false));
    },
    dragMouse: (from: ScreenPoint, to: ScreenPoint, options: MousePointerOptions = {}) => {
      const steps = options.steps ?? 4;
      emit('pointerdown', mouse(from, options, true));
      for (let step = 1; step <= steps; step += 1) {
        emit('pointermove', mouse(interpolate(from, to, step / steps), options, true));
      }
      emit('pointerup', mouse(to, options, false));
    },
    wheelAt: (screen: ScreenPoint, deltaY: number) => {
      withPagePointerGlobals(() =>
        systems.input.emit('wheel', mouse(screen, {}, false), [], 0, deltaY, 0),
      );
    },
    touchTapAt: (screen: ScreenPoint, pointerId = 1) => {
      emit('pointerdown', touch(screen, pointerId, true));
      emit('pointerup', touch(screen, pointerId, false));
    },
    dragTouch: (from: ScreenPoint, to: ScreenPoint, steps = 4) => {
      emit('pointerdown', touch(from, 1, true));
      for (let step = 1; step <= steps; step += 1) {
        emit('pointermove', touch(interpolate(from, to, step / steps), 1, true));
      }
      emit('pointerup', touch(to, 1, false));
    },
    pinch: (from: [ScreenPoint, ScreenPoint], to: [ScreenPoint, ScreenPoint], steps = 4) => {
      emit('pointerdown', touch(from[0], 1, true));
      emit('pointerdown', touch(from[1], 2, true));
      for (let step = 1; step <= steps; step += 1) {
        emit('pointermove', touch(interpolate(from[0], to[0], step / steps), 1, true));
        emit('pointermove', touch(interpolate(from[1], to[1], step / steps), 2, true));
      }
      emit('pointerup', touch(to[0], 1, false));
      emit('pointerup', touch(to[1], 2, false));
    },
  };
}
