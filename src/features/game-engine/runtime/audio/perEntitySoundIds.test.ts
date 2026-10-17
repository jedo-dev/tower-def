import { describe, expect, it } from 'vitest';
import { BUILDABLE_TOWER_IDS, tryResolveBuildableTowerById } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import { RACE_SOUND_GROUP_IDS, SOUND_IDS_BY_GROUP } from '../../../../shared/types/sound-ids';

const PER_ENTITY_ID = /^combat\.(creep|tower)\.([a-z_]+)\.[a-z]+$/;

/**
 * Per-creature and per-tower ids (`combat.creep.<unitId>.<slot>`,
 * `combat.tower.<towerId>.<slot>`) name a real creature or tower of the race
 * whose group file declares them, so a race author cannot claim another
 * race's entity or a typo'd id.
 */
describe('per-entity sound ids', () => {
  it.each(RACE_SOUND_GROUP_IDS)('name a real %s creature or tower', (group) => {
    for (const soundId of SOUND_IDS_BY_GROUP[group]) {
      const match = PER_ENTITY_ID.exec(soundId);
      if (!match) {
        continue;
      }
      const [, kind, entityId] = match;
      const towerId = BUILDABLE_TOWER_IDS.find((id) => id === entityId);
      const faction =
        kind === 'creep'
          ? getAllUnitConfigs().find((unit) => unit.id === entityId)?.faction
          : towerId && tryResolveBuildableTowerById(towerId)?.faction;

      expect(faction?.toLowerCase(), soundId).toBe(group);
    }
  });
});
