// Session-wide store for sound clip files. The menu (React) and every Phaser
// game instance read clips through one cache, so a clip is fetched once per
// session no matter how many players ask for it: a StrictMode remount, a new
// match or the menu and the game wanting the same file.

/** Downloads one clip file. */
export type AudioClipFetcher = (url: string) => Promise<Blob>;

/** Decodes clip bytes into playable audio (e.g. `AudioContext.decodeAudioData`). */
export type AudioClipDecoder = (bytes: ArrayBuffer) => Promise<AudioBuffer>;

export type AudioClipCache = {
  /** Fetches the clip once; concurrent and later callers share the result. */
  loadClip: (url: string) => Promise<Blob>;
  /**
   * Decodes the clip once. An `AudioBuffer` is not bound to the context that
   * decoded it, so every game instance can play the same buffer.
   */
  decodeClip: (url: string, decode: AudioClipDecoder) => Promise<AudioBuffer>;
  /** One object URL per clip, for `HTMLAudioElement` players. */
  getObjectUrl: (url: string) => Promise<string>;
  /** The clip's object URL if it is already loaded, without starting a fetch. */
  peekObjectUrl: (url: string) => string | undefined;
};

export type AudioClipCacheOptions = {
  fetchClip: AudioClipFetcher;
  createObjectUrl: (blob: Blob) => string;
};

/**
 * Memoizes `create` per key. A rejected promise is evicted so the next caller
 * retries instead of inheriting a stale failure forever.
 */
function memoizeSettled<TValue>(
  entries: Map<string, Promise<TValue>>,
  key: string,
  create: () => Promise<TValue>,
): Promise<TValue> {
  const cached = entries.get(key);
  if (cached) {
    return cached;
  }
  const pending = create();
  entries.set(key, pending);
  pending.catch(() => {
    if (entries.get(key) === pending) {
      entries.delete(key);
    }
  });
  return pending;
}

export function createAudioClipCache(options: AudioClipCacheOptions): AudioClipCache {
  const { fetchClip, createObjectUrl } = options;
  const clipFiles = new Map<string, Promise<Blob>>();
  const decodedClips = new Map<string, Promise<AudioBuffer>>();
  const objectUrls = new Map<string, Promise<string>>();
  const readyObjectUrls = new Map<string, string>();

  const loadClip = (url: string): Promise<Blob> =>
    memoizeSettled(clipFiles, url, () => fetchClip(url));

  const decodeClip = (url: string, decode: AudioClipDecoder): Promise<AudioBuffer> => {
    const inFlight = decodedClips.get(url);
    if (inFlight) {
      // The decoder that started this entry may belong to a game that has
      // since been torn down; if it fails, retry once with this caller's.
      return inFlight.catch(() => decodeClip(url, decode));
    }
    return memoizeSettled(decodedClips, url, async () => {
      const file = await loadClip(url);
      // `decodeAudioData` detaches the buffer it gets, so each decode reads a
      // fresh copy and the cached file stays intact.
      return decode(await file.arrayBuffer());
    });
  };

  const getObjectUrl = (url: string): Promise<string> =>
    memoizeSettled(objectUrls, url, async () => {
      const objectUrl = createObjectUrl(await loadClip(url));
      readyObjectUrls.set(url, objectUrl);
      return objectUrl;
    });

  return {
    loadClip,
    decodeClip,
    getObjectUrl,
    peekObjectUrl: (url) => readyObjectUrls.get(url),
  };
}

async function fetchClipFromNetwork(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sound clip ${url}: HTTP ${response.status}`);
  }
  return response.blob();
}

/** The one cache every audio player in the session shares. */
export const sessionAudioClipCache: AudioClipCache = createAudioClipCache({
  fetchClip: fetchClipFromNetwork,
  createObjectUrl: (blob) => URL.createObjectURL(blob),
});
