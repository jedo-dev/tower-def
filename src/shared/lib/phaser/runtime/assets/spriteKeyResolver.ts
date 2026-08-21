import { UNIT_FACTION_TINTS } from '../../../../constants/sprites';
import type { RaceId } from '../../../../types/content-ids';
import { PLACEHOLDER_TEXTURE_KEYS, type PlaceholderTextureKey } from './placeholderTexture';

export type SpriteKind = 'unit' | 'tower';

/** Minimal slice of a Phaser scene, so the resolver is testable without one. */
export type TextureLookup = {
  exists: (textureKey: string) => boolean;
};

export type ResolveSpriteOptions = {
  /** Race whose tint the placeholder should wear. */
  raceId?: RaceId;
  /** Content id behind the request, used by the missing-art report. */
  contentId?: string;
};

export type ResolvedSprite = {
  spriteKey: string;
  isPlaceholder: boolean;
  /** Tint to apply; only set when the placeholder stands in for real art. */
  placeholderTint?: number;
};

const PLACEHOLDER_KEY_BY_KIND: Record<SpriteKind, PlaceholderTextureKey> = {
  unit: PLACEHOLDER_TEXTURE_KEYS.UNIT,
  tower: PLACEHOLDER_TEXTURE_KEYS.TOWER,
};

export const PLACEHOLDER_DEFAULT_TINT = 0xffffff;

type MissingArtListener = (report: {
  kind: SpriteKind;
  requestedKey: string;
  contentId?: string;
}) => void;

let missingArtListener: MissingArtListener | undefined;

/** Lets the missing-art report observe every fallback without owning the resolver. */
export function setMissingArtListener(listener: MissingArtListener | undefined): void {
  missingArtListener = listener;
}

/**
 * Single answer to "what texture should this creep or tower draw?". Content can
 * name art that does not exist yet; the placeholder stands in instead of
 * throwing or rendering an invisible sprite.
 */
export function resolveSpriteKey(
  textures: TextureLookup,
  kind: SpriteKind,
  requestedKey: string,
  options?: ResolveSpriteOptions,
): ResolvedSprite {
  if (requestedKey !== '' && textures.exists(requestedKey)) {
    return { spriteKey: requestedKey, isPlaceholder: false };
  }

  missingArtListener?.({ kind, requestedKey, contentId: options?.contentId });

  const placeholderKey = PLACEHOLDER_KEY_BY_KIND[kind];
  const placeholderTint = options?.raceId
    ? UNIT_FACTION_TINTS[options.raceId] ?? PLACEHOLDER_DEFAULT_TINT
    : PLACEHOLDER_DEFAULT_TINT;

  // The placeholder itself may be missing in a headless or torn-down scene; the
  // requested key is still the most useful thing to hand back.
  if (!textures.exists(placeholderKey)) {
    return { spriteKey: requestedKey, isPlaceholder: false };
  }

  return { spriteKey: placeholderKey, isPlaceholder: true, placeholderTint };
}
