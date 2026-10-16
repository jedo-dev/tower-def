import type { GridPosition } from '../../../../shared/types/pathfinding';

/**
 * Two-tap placement on touch: the first tap arms a block (preview with range
 * and validity), a second tap on the same block confirms the build, a tap on
 * another block re-arms there. A rejected confirm keeps the block armed, so
 * the player sees why through the build-rejected feedback and can move on.
 */
export type PlacementTapDecision =
  | { kind: 'arm'; anchor: GridPosition }
  | { kind: 'confirm'; anchor: GridPosition };

export function isSameAnchor(first: GridPosition | null, second: GridPosition | null): boolean {
  return first !== null && second !== null && first.x === second.x && first.y === second.y;
}

export function resolvePlacementTap(
  pendingAnchor: GridPosition | null,
  tappedAnchor: GridPosition,
): PlacementTapDecision {
  if (isSameAnchor(pendingAnchor, tappedAnchor)) {
    return { kind: 'confirm', anchor: tappedAnchor };
  }
  return { kind: 'arm', anchor: tappedAnchor };
}

export type PreviewAnchorInput = {
  pendingAnchor: GridPosition | null;
  hoveredAnchor: GridPosition | null;
  /** The last pointer was a finger and the second-tap confirmation is on. */
  confirmsTouchPlacement: boolean;
};

/**
 * The block the build preview shows. In touch confirmation mode only the armed
 * block is previewed, so a finished build or a lifted finger leaves no stale
 * preview behind; otherwise the armed block wins over the hovered one.
 */
export function resolvePreviewAnchor(input: PreviewAnchorInput): GridPosition | null {
  if (input.pendingAnchor) {
    return input.pendingAnchor;
  }
  return input.confirmsTouchPlacement ? null : input.hoveredAnchor;
}
