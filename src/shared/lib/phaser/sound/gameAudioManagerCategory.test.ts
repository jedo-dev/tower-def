import { describe, expect, it, vi } from 'vitest';
import { AUDIO_CONSTANTS } from './audio.constants';

vi.mock('phaser', () => ({
  default: {
    Math: { Distance: { Between: () => 0 } },
  },
}));

const { GameAudioManager } = await import('./GameAudioManager');

type PlayedSound = {
  isPlaying: boolean;
  setVolume: (value: number) => void;
  setLoop: (value: boolean) => void;
  play: () => void;
  stop: () => void;
};

function createSceneStub() {
  const created: PlayedSound[] = [];
  const scene = {
    cache: { audio: { exists: () => true } },
    sound: {
      add: () => {
        const sound: PlayedSound = {
          isPlaying: true,
          setVolume: () => undefined,
          setLoop: () => undefined,
          play: () => undefined,
          stop() {
            this.isPlaying = false;
          },
        };
        created.push(sound);
        return sound;
      },
      unlock: () => undefined,
    },
    time: { now: 0, delayedCall: () => undefined },
    cameras: { main: null },
    scale: { width: 320, height: 480 },
    load: { audio: () => undefined },
  };
  return { scene, created };
}

describe('GameAudioManager category budget', () => {
  it('releases the category slot when a sound is stopped by id', () => {
    const { scene } = createSceneStub();
    const manager = new GameAudioManager(scene as never);
    manager.unlock();

    // Far more stop/play cycles than the per-category budget: without
    // releasing the slot on stop, ambient audio would go silent forever.
    const cycles = AUDIO_CONSTANTS.MAX_SIMULTANEOUS_SAME_CATEGORY * 3;
    for (let index = 0; index < cycles; index += 1) {
      expect(manager.play('ambient.tension')).toBe(true);
      manager.stopSound('ambient.tension');
    }

    expect(manager.play('ambient.tension')).toBe(true);
  });

  it('stopAll clears the budget as well', () => {
    const { scene } = createSceneStub();
    const manager = new GameAudioManager(scene as never);
    manager.unlock();

    manager.play('ambient.tension');
    manager.stopAll();

    expect(manager.getActiveCount()).toBe(0);
    expect(manager.play('ambient.tension')).toBe(true);
  });
});
