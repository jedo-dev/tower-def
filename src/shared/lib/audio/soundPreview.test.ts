import { describe, expect, it, vi } from 'vitest';
import { createAudioClipCache } from './audioClipCache';
import {
  createSoundPreviewPlayer,
  previewVolume,
  type PreviewAudioElement,
  type SoundPreviewDependencies,
} from './soundPreview';

type FakeAudio = PreviewAudioElement & { objectUrl: string };

function setup(userScale = 1) {
  const cache = createAudioClipCache({
    fetchClip: async () => new Blob([new Uint8Array([1])]),
    createObjectUrl: () => 'blob:clip',
  });
  const created: FakeAudio[] = [];
  const dependencies: SoundPreviewDependencies = {
    cache,
    getUserScale: () => userScale,
    resolveUrl: (soundId) => `/${soundId}.wav`,
    createAudio: (objectUrl) => {
      const audio: FakeAudio = {
        objectUrl,
        volume: 1,
        currentTime: 0,
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
      };
      created.push(audio);
      return audio;
    },
  };
  return { cache, created, player: createSoundPreviewPlayer(dependencies) };
}

describe('soundPreview', () => {
  it('loads a clip on the first press and plays it once it arrives', async () => {
    const { cache, created, player } = setup();

    player.play('combat.creep_hit');
    await cache.getObjectUrl('/combat.creep_hit.wav');

    expect(created).toHaveLength(1);
    expect(created[0].play).toHaveBeenCalledTimes(1);
    expect(created[0].volume).toBeCloseTo(previewVolume('combat.creep_hit', 1));
  });

  it('restarts instead of stacking when pressed again', async () => {
    const { cache, created, player } = setup();
    await cache.getObjectUrl('/combat.creep_hit.wav');

    player.play('combat.creep_hit');
    player.play('combat.creep_hit');

    expect(created).toHaveLength(2);
    expect(created[0].pause).toHaveBeenCalledTimes(1);
    expect(created[1].pause).not.toHaveBeenCalled();
  });

  it('drops a clip that finishes loading after a newer press', async () => {
    const { cache, created, player } = setup();

    player.play('combat.creep_hit');
    player.play('combat.creep_death');
    await cache.getObjectUrl('/combat.creep_hit.wav');
    await cache.getObjectUrl('/combat.creep_death.wav');

    expect(created).toHaveLength(1);
  });

  it('stays silent while muted', async () => {
    const { cache, created, player } = setup(0);
    await cache.getObjectUrl('/combat.creep_hit.wav');

    player.play('combat.creep_hit');

    expect(created).toHaveLength(0);
  });
});
