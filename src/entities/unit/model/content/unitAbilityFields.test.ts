import { describe, expect, it } from 'vitest';
import { parseUnitContentFile } from './loadUnitContent';
import { parseCreatureAbilities } from './unitAbilityFields';
import { createTalentBranches } from './fixtures/talentBranchFixture';

const FILE = 'content/units/undead.json';
const LOCATION = { file: FILE, entityId: 'undead_skeleton' };

function createEntry(abilities?: unknown): Record<string, unknown> {
  return {
    id: 'undead_skeleton',
    name: 'Skeleton',
    tier: 1,
    health: 110,
    speed: 1.3,
    physicalArmor: 0,
    magicalArmor: 0,
    damage: 12,
    rewardGold: 6,
    spriteKey: 'unit.undead.skeleton',
    talentBranches: createTalentBranches('undead_skeleton'),
    ...(abilities === undefined ? {} : { abilities }),
  };
}

function parseEntry(abilities?: unknown) {
  const [unit] = parseUnitContentFile({
    file: FILE,
    data: { schemaVersion: 4, race: 'UNDEAD', units: [createEntry(abilities)] },
  });
  return unit;
}

const FULL_ABILITIES = {
  effectResistance: { chill: 0.5, stun: 0, poison: 1 },
  dodgeEveryNthShot: 4,
  healthRegenPerSecond: 3.5,
  regenPausedByPoison: true,
  incomingDamageMultipliers: { splash: 0.6, percent: 0.5, dot: 1.5 },
  speedBoostBelowHpShare: { hpShare: 0.3, speedMultiplier: 1.5 },
  speedBoostLastRouteShare: { routeShare: 0.2, speedMultiplier: 2 },
  startInvisibleMs: 2000,
  leakLivesTaken: 2,
  leakGoldToSender: 5,
  killGoldPenaltyToDefender: 3,
  shieldHp: 40,
  shieldRechargeMs: 4000,
  secondLife: { hpShare: 0.5, speedMultiplier: 1.2, immuneToChill: true },
  freeNthSend: 3,
};

describe('creature abilities parser', () => {
  it('leaves a creature without abilities untouched', () => {
    expect(parseEntry()).not.toHaveProperty('abilities');
  });

  it('drops an empty abilities object', () => {
    expect(parseEntry({})).not.toHaveProperty('abilities');
  });

  it('reads every ability field', () => {
    expect(parseEntry(FULL_ABILITIES).abilities).toEqual(FULL_ABILITIES);
  });

  it('is reusable for talent grade objects', () => {
    expect(parseCreatureAbilities({ dodgeEveryNthShot: 3 }, LOCATION)).toEqual({
      dodgeEveryNthShot: 3,
    });
  });

  it.each([
    [{ unknownAbility: 1 }, 'unknownAbility'],
    [{ dodgeEveryNthShot: 1 }, 'dodgeEveryNthShot'],
    [{ dodgeEveryNthShot: 2.5 }, 'whole number'],
    [{ leakLivesTaken: 0 }, 'leakLivesTaken'],
    [{ freeNthSend: 1 }, 'freeNthSend'],
    [{ effectResistance: { chill: 1.5 } }, 'chill'],
    [{ effectResistance: { fire: 0.5 } }, 'fire'],
    [{ incomingDamageMultipliers: { splash: 3 } }, 'splash'],
    [{ incomingDamageMultipliers: { magic: 1 } }, 'magic'],
    [{ speedBoostBelowHpShare: { hpShare: 0.3 } }, 'speedMultiplier'],
    [{ speedBoostLastRouteShare: { hpShare: 0.3, speedMultiplier: 2 } }, 'hpShare'],
    [{ secondLife: { speedMultiplier: 2 } }, 'hpShare'],
    [{ secondLife: { hpShare: 0.5, immuneToChill: 'yes' } }, 'immuneToChill'],
    [{ shieldRechargeMs: 1000 }, 'needs "shieldHp"'],
    [{ regenPausedByPoison: true }, 'needs "healthRegenPerSecond"'],
    ['fast', 'expected an object'],
  ])('rejects %j naming the file and creature', (abilities, message) => {
    expect(() => parseEntry(abilities)).toThrow(FILE);
    expect(() => parseEntry(abilities)).toThrow('undead_skeleton');
    expect(() => parseEntry(abilities)).toThrow(message);
  });
});
