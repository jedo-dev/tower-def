import { describe, expect, it } from 'vitest';
import { FACTION_ACCENT_COLORS } from '../../../../shared/constants/theme/gameColors';
import { RACE_IDS, RaceId } from '../../../../shared/types/content-ids';
import { RACE_ACCENT_COLORS, resolveSenderRingColor } from './creepAdornmentStyle';

describe('resolveSenderRingColor', () => {
  it('gives baseline creeps no ring', () => {
    expect(resolveSenderRingColor(undefined, RaceId.UNDEAD, RaceId.ORC)).toBeUndefined();
  });

  it('uses the accent of the race that sent the creep', () => {
    expect(resolveSenderRingColor('player', RaceId.UNDEAD, RaceId.ORC)).toBe(
      FACTION_ACCENT_COLORS.undead,
    );
    expect(resolveSenderRingColor('opponent', RaceId.UNDEAD, RaceId.ORC)).toBe(
      FACTION_ACCENT_COLORS.orc,
    );
  });

  it('has an accent for every race, and no two races share one', () => {
    const colors = RACE_IDS.map((raceId) => RACE_ACCENT_COLORS[raceId]);

    expect(colors.every((color) => Number.isInteger(color))).toBe(true);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
