import { RaceId } from '../../../types/content-ids';

/** Folder of the race emblems cut by tools/slice-portraits.py. */
const FACTION_EMBLEM_DIRECTORY = '/assets/ui/factions';

/** Display name of each race, used as the emblem's alternative text. */
export const RACE_DISPLAY_NAMES: Readonly<Record<RaceId, string>> = {
  [RaceId.UNDEAD]: 'Undead',
  [RaceId.ORC]: 'Orc',
  [RaceId.HUMAN]: 'Human',
  [RaceId.ELF]: 'Elf',
};

/** Public URL of a race emblem; the file name is the lower-case race id. */
export function toFactionEmblemSource(race: RaceId): string {
  return `${FACTION_EMBLEM_DIRECTORY}/${race.toLowerCase()}.webp`;
}
