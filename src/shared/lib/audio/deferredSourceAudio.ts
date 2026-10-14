import type { FadeableAudio } from './ambientFader';

/** The subset of HTMLAudioElement a deferred-source player drives. */
export type SourceableAudioElement = FadeableAudio & {
  src: string;
};

/**
 * Wraps an audio element whose source arrives later (e.g. an object URL from
 * the shared clip cache). A `play()` issued before the source is ready is
 * remembered and honoured once it lands, unless `pause()` cancels it first.
 */
export function createDeferredSourceAudio(
  element: SourceableAudioElement,
  source: Promise<string>,
  onSourceError: (error: unknown) => void = () => undefined,
): FadeableAudio {
  let isSourceReady = false;
  let wantsPlayback = false;

  source.then(
    (url) => {
      element.src = url;
      isSourceReady = true;
      if (wantsPlayback) {
        void element.play().catch(() => undefined);
      }
    },
    (error: unknown) => onSourceError(error),
  );

  return {
    get volume() {
      return element.volume;
    },
    set volume(value: number) {
      element.volume = value;
    },
    get currentTime() {
      return element.currentTime;
    },
    set currentTime(value: number) {
      element.currentTime = value;
    },
    pause: () => {
      wantsPlayback = false;
      element.pause();
    },
    play: () => {
      wantsPlayback = true;
      return isSourceReady ? element.play() : Promise.resolve();
    },
  };
}
