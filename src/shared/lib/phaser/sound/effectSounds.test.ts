import { describe, expect, it, vi } from 'vitest';
import {
  EFFECT_APPLY_SOUND_COOLDOWN_MS,
  PENDING_SOUND_ASSETS,
  SOUND_ASSET_PATHS,
  SOUND_REGISTRY,
} from './audio.constants';
import { SoundCategory, type SoundId } from './audio.types';

vi.mock('phaser', () => ({
  default: {
    Math: { Distance: { Between: () => 0 } },
  },
}));

const { GameAudioManager } = await import('./GameAudioManager');

const EFFECT_SOUND_IDS: SoundId[] = [
  'combat.effect_applied.chill',
  'combat.effect_applied.poison',
  'combat.effect_applied.stun',
];

function createSceneStub(options?: { hasAudio?: boolean }) {
  const played: string[] = [];
  const loadedKeys: string[] = [];
  const scene = {
    cache: { audio: { exists: () => options?.hasAudio ?? true } },
    sound: {
      add: (key: string) => {
        played.push(key);
        return {
          isPlaying: true,
          setVolume: () => undefined,
          setLoop: () => undefined,
          play: () => undefined,
          stop: () => undefined,
          on: () => undefined,
        };
      },
      unlock: () => undefined,
    },
    time: { now: 0, delayedCall: () => undefined },
    cameras: { main: null },
    scale: { width: 320, height: 480 },
    load: { audio: (key: string) => loadedKeys.push(key) },
  };

  return { scene, played, loadedKeys };
}

describe('status effect sounds', () => {
  it('registers every effect stinger in the combat category with the shared throttle', () => {
    for (const soundId of EFFECT_SOUND_IDS) {
      const config = SOUND_REGISTRY[soundId];

      expect(config, soundId).toBeDefined();
      expect(config.category, soundId).toBe(SoundCategory.COMBAT);
      expect(config.cooldownMs, soundId).toBe(EFFECT_APPLY_SOUND_COOLDOWN_MS);
    }
  });

  it('points every effect stinger at a declared asset path', () => {
    for (const soundId of EFFECT_SOUND_IDS) {
      expect(SOUND_ASSET_PATHS[soundId], soundId).toMatch(/combat_effect_.+\.wav$/);
    }
  });

  it('skips pending assets while preloading so nothing requests a missing file', () => {
    const { scene, loadedKeys } = createSceneStub({ hasAudio: false });
    const manager = new GameAudioManager(scene as never);

    manager.preload();

    for (const soundId of PENDING_SOUND_ASSETS) {
      expect(loadedKeys, soundId).not.toContain(`audio.${soundId}`);
    }
    expect(loadedKeys.length).toBeGreaterThan(0);
  });

  it('stays silent instead of throwing when the file is not in the cache', () => {
    const { scene, played } = createSceneStub({ hasAudio: false });
    const manager = new GameAudioManager(scene as never);
    manager.unlock();

    expect(() => manager.play('combat.effect_applied.chill')).not.toThrow();
    expect(manager.play('combat.effect_applied.chill')).toBe(false);
    expect(played).toHaveLength(0);
  });

  it('throttles repeated applications inside the cooldown window', () => {
    const { scene, played } = createSceneStub();
    const manager = new GameAudioManager(scene as never);
    manager.unlock();

    expect(manager.play('combat.effect_applied.poison')).toBe(true);
    expect(manager.play('combat.effect_applied.poison')).toBe(false);
    expect(played).toHaveLength(1);

    scene.time.now = EFFECT_APPLY_SOUND_COOLDOWN_MS + 1;

    expect(manager.play('combat.effect_applied.poison')).toBe(true);
    expect(played).toHaveLength(2);
  });
});
