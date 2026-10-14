import { describe, expect, it, vi } from 'vitest';
import { createAudioClipCache } from '../../../shared/lib/audio/audioClipCache';
import {
  PENDING_SOUND_ASSETS,
  resolveSoundClipUrl,
  SOUND_ASSET_PATHS,
} from '../../../shared/lib/sound-registry/audio.constants';
import type { SoundId } from '../../../shared/lib/sound-registry/audio.types';

vi.mock('phaser', () => ({
  default: {
    Math: { Distance: { Between: () => 0 } },
  },
}));

const { GameAudioManager } = await import('./GameAudioManager');

const PRELOADED_SOUND_IDS = (Object.keys(SOUND_ASSET_PATHS) as SoundId[]).filter(
  (soundId) => !PENDING_SOUND_ASSETS.includes(soundId),
);

type SceneStubOptions = { hasWebAudio?: boolean };

function createSceneStub({ hasWebAudio = true }: SceneStubOptions = {}) {
  const audioCache = new Map<string, unknown>();
  const loaderQueue: string[] = [];
  const game = { pendingDestroy: false };
  const decodeAudioData = vi.fn(async () => ({}) as AudioBuffer);
  const scene = {
    sys: { game },
    cache: {
      audio: {
        exists: (key: string) => audioCache.has(key),
        add: (key: string, data: unknown) => audioCache.set(key, data),
      },
    },
    sound: {
      ...(hasWebAudio ? { context: { decodeAudioData } } : {}),
      add: () => null,
      unlock: () => undefined,
    },
    load: {
      audio: (key: string) => {
        loaderQueue.push(key);
      },
    },
    time: { now: 0, delayedCall: () => undefined },
    cameras: { main: null },
    scale: { width: 320, height: 480 },
  };
  return { scene, audioCache, loaderQueue, game, decodeAudioData };
}

function createSharedCache() {
  const fetchClip = vi.fn<(url: string) => Promise<Blob>>(
    async () => new Blob([new Uint8Array([0])]),
  );
  const cache = createAudioClipCache({ fetchClip, createObjectUrl: () => 'blob:clip' });
  return { cache, fetchClip };
}

async function flushClipLoads(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GameAudioManager clip preload', () => {
  it('fetches each clip once when the game is created twice (StrictMode remount)', async () => {
    const { cache, fetchClip } = createSharedCache();
    const firstGame = createSceneStub();
    const secondGame = createSceneStub();

    const firstManager = new GameAudioManager(firstGame.scene as never, true, 0.7, cache);
    firstManager.preload();
    firstGame.game.pendingDestroy = true;
    new GameAudioManager(secondGame.scene as never, true, 0.7, cache).preload();
    await flushClipLoads();

    expect(fetchClip).toHaveBeenCalledTimes(PRELOADED_SOUND_IDS.length);
    const fetchedUrls = fetchClip.mock.calls.map(([url]) => url);
    expect(new Set(fetchedUrls).size).toBe(PRELOADED_SOUND_IDS.length);
    expect(secondGame.audioCache.size).toBe(PRELOADED_SOUND_IDS.length);
    expect(secondGame.audioCache.has('audio.ui.click')).toBe(true);
    // The torn-down game never receives late clips.
    expect(firstGame.audioCache.size).toBe(0);
    expect(firstGame.loaderQueue).toEqual([]);
    expect(secondGame.loaderQueue).toEqual([]);
  });

  it('reuses decoded clips for a later match without fetching again', async () => {
    const { cache, fetchClip } = createSharedCache();
    const firstMatch = createSceneStub();
    const firstManager = new GameAudioManager(firstMatch.scene as never, true, 0.7, cache);
    firstManager.preload();
    await flushClipLoads();
    firstManager.destroy();

    const secondMatch = createSceneStub();
    new GameAudioManager(secondMatch.scene as never, true, 0.7, cache).preload();
    await flushClipLoads();

    expect(fetchClip).toHaveBeenCalledTimes(PRELOADED_SOUND_IDS.length);
    expect(secondMatch.decodeAudioData).not.toHaveBeenCalled();
    expect(secondMatch.audioCache.size).toBe(PRELOADED_SOUND_IDS.length);
  });

  it('falls back to the Phaser loader when Web Audio is unavailable', () => {
    const { cache, fetchClip } = createSharedCache();
    const htmlAudioGame = createSceneStub({ hasWebAudio: false });

    new GameAudioManager(htmlAudioGame.scene as never, true, 0.7, cache).preload();

    expect(fetchClip).not.toHaveBeenCalled();
    expect(htmlAudioGame.loaderQueue).toHaveLength(PRELOADED_SOUND_IDS.length);
  });

  it('resolves every clip to one absolute URL shared by menu and game', () => {
    expect(resolveSoundClipUrl('ambient.map')).toBe('/assets/audio/sfx/ambient/ambient_map_01.wav');
  });
});
