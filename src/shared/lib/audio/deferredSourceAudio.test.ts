import { describe, expect, it, vi } from 'vitest';
import { createDeferredSourceAudio, type SourceableAudioElement } from './deferredSourceAudio';

function createFakeElement() {
  const element: SourceableAudioElement & { playCalls: number; pauseCalls: number } = {
    src: '',
    volume: 1,
    currentTime: 0,
    playCalls: 0,
    pauseCalls: 0,
    play: () => {
      element.playCalls += 1;
      return Promise.resolve();
    },
    pause: () => {
      element.pauseCalls += 1;
    },
  };
  return element;
}

function createControlledSource() {
  let resolveSource: (url: string) => void = () => undefined;
  let rejectSource: (error: unknown) => void = () => undefined;
  const source = new Promise<string>((resolve, reject) => {
    resolveSource = resolve;
    rejectSource = reject;
  });
  return { source, resolveSource, rejectSource };
}

describe('createDeferredSourceAudio', () => {
  it('honours a play requested before the source arrived', async () => {
    const element = createFakeElement();
    const { source, resolveSource } = createControlledSource();
    const audio = createDeferredSourceAudio(element, source);

    await audio.play();
    expect(element.playCalls).toBe(0);

    resolveSource('blob:ambient');
    await source;

    expect(element.src).toBe('blob:ambient');
    expect(element.playCalls).toBe(1);
  });

  it('drops a pending play cancelled by pause', async () => {
    const element = createFakeElement();
    const { source, resolveSource } = createControlledSource();
    const audio = createDeferredSourceAudio(element, source);

    void audio.play();
    audio.pause();
    resolveSource('blob:ambient');
    await source;

    expect(element.playCalls).toBe(0);
    expect(element.src).toBe('blob:ambient');
  });

  it('plays immediately once the source is ready and forwards volume and time', async () => {
    const element = createFakeElement();
    const audio = createDeferredSourceAudio(element, Promise.resolve('blob:ambient'));
    await Promise.resolve();

    await audio.play();
    audio.volume = 0.4;
    audio.currentTime = 3;

    expect(element.playCalls).toBe(1);
    expect(element.volume).toBe(0.4);
    expect(audio.currentTime).toBe(3);
  });

  it('reports a source that failed to load', async () => {
    const element = createFakeElement();
    const { source, rejectSource } = createControlledSource();
    const onSourceError = vi.fn();
    createDeferredSourceAudio(element, source, onSourceError);

    rejectSource(new Error('offline'));
    await source.catch(() => undefined);

    expect(onSourceError).toHaveBeenCalledTimes(1);
  });
});
