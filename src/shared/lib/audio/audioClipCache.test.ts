import { describe, expect, it, vi } from 'vitest';
import { createAudioClipCache, type AudioClipDecoder } from './audioClipCache';

const CLIP_URL = '/assets/audio/sfx/ui/ui_click.wav';

function createCountingCache(
  fetchClip = vi.fn<(url: string) => Promise<Blob>>(async () => new Blob([new Uint8Array([1, 2])])),
) {
  let objectUrlCount = 0;
  const createObjectUrl = vi.fn(() => {
    objectUrlCount += 1;
    return `blob:clip-${objectUrlCount}`;
  });
  const cache = createAudioClipCache({ fetchClip, createObjectUrl });
  return { cache, fetchClip, createObjectUrl };
}

function fakeBuffer(label: string): AudioBuffer {
  return { label } as unknown as AudioBuffer;
}

describe('audioClipCache', () => {
  it('fetches a clip once for concurrent and later callers', async () => {
    const { cache, fetchClip } = createCountingCache();

    const [first, second] = await Promise.all([cache.loadClip(CLIP_URL), cache.loadClip(CLIP_URL)]);
    await cache.loadClip(CLIP_URL);
    await cache.getObjectUrl(CLIP_URL);
    await cache.decodeClip(CLIP_URL, async () => fakeBuffer('decoded'));

    expect(fetchClip).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('decodes a clip once and shares the buffer between game instances', async () => {
    const { cache, fetchClip } = createCountingCache();
    const firstGameDecode = vi.fn<AudioClipDecoder>(async () => fakeBuffer('first'));
    const secondGameDecode = vi.fn<AudioClipDecoder>(async () => fakeBuffer('second'));

    const [firstBuffer, secondBuffer] = await Promise.all([
      cache.decodeClip(CLIP_URL, firstGameDecode),
      cache.decodeClip(CLIP_URL, secondGameDecode),
    ]);
    const laterBuffer = await cache.decodeClip(CLIP_URL, secondGameDecode);

    expect(fetchClip).toHaveBeenCalledTimes(1);
    expect(firstGameDecode).toHaveBeenCalledTimes(1);
    expect(secondGameDecode).not.toHaveBeenCalled();
    expect(secondBuffer).toBe(firstBuffer);
    expect(laterBuffer).toBe(firstBuffer);
  });

  it('hands each decode its own copy of the bytes', async () => {
    const { cache } = createCountingCache();
    const seen: ArrayBuffer[] = [];
    const failingDecode: AudioClipDecoder = async (bytes) => {
      seen.push(bytes);
      throw new Error('context closed');
    };

    await expect(cache.decodeClip(CLIP_URL, failingDecode)).rejects.toThrow('context closed');
    await cache.decodeClip(CLIP_URL, async (bytes) => {
      seen.push(bytes);
      return fakeBuffer('ok');
    });

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[1].byteLength).toBe(2);
  });

  it('retries a failed decode with a waiting caller decoder without refetching', async () => {
    const { cache, fetchClip } = createCountingCache();
    const torndownGameDecode: AudioClipDecoder = async () => {
      throw new Error('context closed');
    };
    const liveGameDecode = vi.fn<AudioClipDecoder>(async () => fakeBuffer('live'));

    const torndown = cache.decodeClip(CLIP_URL, torndownGameDecode);
    const live = cache.decodeClip(CLIP_URL, liveGameDecode);

    await expect(torndown).rejects.toThrow('context closed');
    await expect(live).resolves.toEqual({ label: 'live' });
    expect(liveGameDecode).toHaveBeenCalledTimes(1);
    expect(fetchClip).toHaveBeenCalledTimes(1);
  });

  it('evicts a failed fetch so the next caller retries', async () => {
    const fetchClip = vi
      .fn<(url: string) => Promise<Blob>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(new Blob([new Uint8Array([1])]));
    const { cache } = createCountingCache(fetchClip);

    await expect(cache.loadClip(CLIP_URL)).rejects.toThrow('offline');
    await expect(cache.loadClip(CLIP_URL)).resolves.toBeInstanceOf(Blob);
    expect(fetchClip).toHaveBeenCalledTimes(2);
  });

  it('creates one object URL per clip and exposes it once ready', async () => {
    const { cache, createObjectUrl } = createCountingCache();

    expect(cache.peekObjectUrl(CLIP_URL)).toBeUndefined();
    const [first, second] = await Promise.all([
      cache.getObjectUrl(CLIP_URL),
      cache.getObjectUrl(CLIP_URL),
    ]);

    expect(first).toBe('blob:clip-1');
    expect(second).toBe(first);
    expect(cache.peekObjectUrl(CLIP_URL)).toBe(first);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
  });
});
