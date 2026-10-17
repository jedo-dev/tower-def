import { describe, expect, it } from 'vitest';
import { SOUND_PROFILE_LIBRARY } from '../../../entities/sound-profile';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { creepSoundCues, towerSoundCues } from './soundCues';

describe('soundCues', () => {
  it('resolves every creature cue, preferring the creature override', () => {
    const cues = creepSoundCues({
      faction: RaceId.ORC,
      sounds: { creepHit: 'combat.creep.orc_grunt.hit' },
    });

    expect(cues.map((cue) => cue.label)).toEqual(['Hit', 'Death', 'Escape', 'Spawn']);
    expect(cues[0].soundId).toBe('combat.creep.orc_grunt.hit');
  });

  it('lists attack and impact, and upgrade only when it differs from the default', () => {
    const tower = { faction: RaceId.ORC, towerType: TowerTypeId.SINGLE };

    expect(towerSoundCues(tower).map((cue) => cue.label)).toEqual(['Attack', 'Impact']);
    expect(
      towerSoundCues({ ...tower, sounds: { upgrade: 'combat.build' } }).map((cue) => cue.label),
    ).toEqual(['Attack', 'Impact', 'Upgrade']);
    expect(
      towerSoundCues({
        ...tower,
        sounds: { upgrade: SOUND_PROFILE_LIBRARY.defaultProfile.sounds.upgrade },
      }),
    ).toHaveLength(2);
  });
});
