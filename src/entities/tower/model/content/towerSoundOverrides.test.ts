import { describe, expect, it } from 'vitest';
import { parseTowerContentFile } from './loadTowerContent';

const FILE = 'content/towers/undead.json';

function parseWithSounds(sounds: unknown) {
  return parseTowerContentFile({
    file: FILE,
    data: {
      schemaVersion: 3,
      race: 'UNDEAD',
      towers: [
        {
          id: 'undead_bone_archer_tower',
          name: 'Bone Archer Tower',
          archetype: 'single',
          costGold: 50,
          damage: 22,
          range: 6.4,
          attackCooldownMs: 800,
          spriteKey: 'tower.undead.bone_archer',
          description: 'Necromantic archer nest built from cursed remains.',
          ...(sounds === undefined ? {} : { sounds }),
        },
      ],
    },
  });
}

describe('tower sound overrides', () => {
  it('leaves the field out when the tower has no overrides', () => {
    const [tower] = parseWithSounds(undefined);

    expect(tower).not.toHaveProperty('sounds');
  });

  it('reads per-tower overrides', () => {
    const [tower] = parseWithSounds({ attack: 'ui.click', sell: 'economy.refund' });

    expect(tower.sounds).toEqual({ attack: 'ui.click', sell: 'economy.refund' });
  });

  it('fails on an unknown sound id with the file and tower id', () => {
    expect(() => parseWithSounds({ attack: 'combat.attack.kazoo' })).toThrow(
      `${FILE} [undead_bone_archer_tower]: "attack" names an unknown sound id "combat.attack.kazoo"`,
    );
  });

  it('rejects creature slots, which belong to race profiles', () => {
    expect(() => parseWithSounds({ creepDeath: 'ui.click' })).toThrow(
      `${FILE} [undead_bone_archer_tower]: unknown field "creepDeath"`,
    );
  });
});
