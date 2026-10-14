// Which clip container the browser can decode. The authored ambience ships as
// OGG Vorbis with an AAC (.m4a) fallback because Safari and iOS WebKit decode
// no Vorbis at all; generated sfx are WAV, which every browser plays.

/** The `canPlayType` answer of an `HTMLMediaElement`. */
export type CanPlayTypeProbe = (mimeType: string) => string;

const MIME_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  ogg: 'audio/ogg; codecs="vorbis"',
  m4a: 'audio/mp4; codecs="mp4a.40.2"',
  mp3: 'audio/mpeg',
};

export function audioMimeTypeForPath(assetPath: string): string | undefined {
  const extension = assetPath.slice(assetPath.lastIndexOf('.') + 1).toLowerCase();
  return MIME_TYPE_BY_EXTENSION[extension];
}

/**
 * Asks the browser's media element. Outside a DOM (tests, the sfx tools)
 * there is nothing to ask, so every format counts as playable.
 */
export function createDomCanPlayTypeProbe(): CanPlayTypeProbe {
  if (typeof document === 'undefined') {
    return () => 'probably';
  }
  const element = document.createElement('audio');
  return (mimeType) => element.canPlayType(mimeType);
}

/**
 * Builds a memoized `isAssetPlayable(path)`. Formats the table does not know
 * (WAV) are assumed playable; the rest are probed once per mime type.
 */
export function createAudioFormatSupport(probe: CanPlayTypeProbe): (assetPath: string) => boolean {
  const verdicts = new Map<string, boolean>();
  return (assetPath) => {
    const mimeType = audioMimeTypeForPath(assetPath);
    if (!mimeType) {
      return true;
    }
    const cached = verdicts.get(mimeType);
    if (cached !== undefined) {
      return cached;
    }
    const verdict = probe(mimeType) !== '';
    verdicts.set(mimeType, verdict);
    return verdict;
  };
}

let sessionSupport: ((assetPath: string) => boolean) | null = null;

/** The one probe the session shares; created lazily so imports stay DOM-free. */
export function isAudioAssetPlayable(assetPath: string): boolean {
  sessionSupport ??= createAudioFormatSupport(createDomCanPlayTypeProbe());
  return sessionSupport(assetPath);
}
