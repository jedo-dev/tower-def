import {
  assertKnownKeys,
  readRecord,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import { CREATURE_ABILITY_KEYS, type CreatureAbilities } from '../abilities';

/**
 * `abilities` of a creature grade: undefined when absent or empty. Unknown
 * keys fail on load naming the file and entity, like every content field.
 */
export function parseCreatureAbilities(
  source: Record<string, unknown>,
  location: ContentLocation,
): CreatureAbilities | undefined {
  if (source.abilities === undefined) {
    return undefined;
  }

  const raw = readRecord(source.abilities, location);
  assertKnownKeys(raw, CREATURE_ABILITY_KEYS, location);

  const abilities: CreatureAbilities = {};
  return Object.keys(abilities).length === 0 ? undefined : abilities;
}
