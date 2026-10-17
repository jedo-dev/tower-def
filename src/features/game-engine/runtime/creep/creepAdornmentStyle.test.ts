import { describe, expect, it } from 'vitest';
import {
  FACTION_ACCENT_COLORS,
  STATUS_COLORS,
} from '../../../../shared/constants/theme/gameColors';
import { RACE_IDS, RaceId } from '../../../../shared/types/content-ids';
import { CREEP_HEALTH_BAR_WARNING_RATIO } from '../../scenes/creepReadability.constants';
import {
  RACE_ACCENT_COLORS,
  isHealthBarShown,
  resolveHealthBarColor,
  resolveHealthRatio,
  resolveSenderRingColor,
} from './creepAdornmentStyle';

describe('health bar style', () => {
  it('clamps the health ratio and treats a creep without spawn health as unhurt', () => {
    expect(resolveHealthRatio(50, 100)).toBe(0.5);
    expect(resolveHealthRatio(-5, 100)).toBe(0);
    expect(resolveHealthRatio(150, 100)).toBe(1);
    expect(resolveHealthRatio(40, undefined)).toBe(1);
    expect(resolveHealthRatio(40, 0)).toBe(1);
  });

  it('stays hidden until the first damage, then stays up', () => {
    expect(isHealthBarShown(1, false)).toBe(false);
    expect(isHealthBarShown(0.99, false)).toBe(true);
    expect(isHealthBarShown(1, true)).toBe(true);
  });

  it('ramps from the success token through warning to danger', () => {
    expect(resolveHealthBarColor(1)).toBe(STATUS_COLORS.success);
    expect(resolveHealthBarColor(CREEP_HEALTH_BAR_WARNING_RATIO)).toBe(STATUS_COLORS.warning);
    expect(resolveHealthBarColor(0)).toBe(STATUS_COLORS.danger);
    expect(resolveHealthBarColor(-1)).toBe(STATUS_COLORS.danger);
  });

  it('gets redder as health drops', () => {
    const red = (color: number): number => (color >> 16) & 0xff;
    const green = (color: number): number => (color >> 8) & 0xff;

    expect(red(resolveHealthBarColor(0.75))).toBeGreaterThan(red(resolveHealthBarColor(1)));
    expect(green(resolveHealthBarColor(0.25))).toBeLessThan(green(resolveHealthBarColor(0.5)));
  });
});

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
