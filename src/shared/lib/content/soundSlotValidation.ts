import { SOUND_IDS, type SoundId, type SoundSlot } from '../../types/sound-ids';
import {
  ContentValidationError,
  assertKnownKeys,
  readRecord,
  readString,
  type ContentLocation,
} from './contentValidation';

function isSoundId(value: string): value is SoundId {
  return (SOUND_IDS as readonly string[]).includes(value);
}

/**
 * Reads one sound id. An unknown id fails with the file, entity and slot, so a
 * typo in a profile cannot ship as a silent tower.
 */
export function readSoundId(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
): SoundId {
  const value = readString(source, key, location);

  if (!isSoundId(value)) {
    throw new ContentValidationError(
      location,
      `"${key}" names an unknown sound id "${value}"; register it in SOUND_IDS first`,
    );
  }

  return value;
}

/**
 * Reads an optional `{ slot: soundId }` map. Only `allowedSlots` may appear:
 * a creature slot on a tower entry is a mistake, not a no-op.
 */
export function readSoundSlotSet<TSlot extends SoundSlot>(
  source: Record<string, unknown>,
  key: string,
  allowedSlots: readonly TSlot[],
  location: ContentLocation,
): Partial<Record<TSlot, SoundId>> | undefined {
  if (source[key] === undefined) {
    return undefined;
  }

  const rawSet = readRecord(source[key], location);
  assertKnownKeys(rawSet, allowedSlots, location);

  const soundSet: Partial<Record<TSlot, SoundId>> = {};

  for (const slot of allowedSlots) {
    if (rawSet[slot] !== undefined) {
      soundSet[slot] = readSoundId(rawSet, slot, location);
    }
  }

  return soundSet;
}
