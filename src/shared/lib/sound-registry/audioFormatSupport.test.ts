import { describe, expect, it, vi } from 'vitest';
import { resolveSoundClipUrl, SOUND_CLIPS } from './audio.constants';
import {
  audioMimeTypeForPath,
  createAudioFormatSupport,
  createDomCanPlayTypeProbe,
} from './audioFormatSupport';

describe('audioMimeTypeForPath', () => {
  it('maps the containers the registry ships', () => {
    expect(audioMimeTypeForPath('assets/a.ogg')).toBe('audio/ogg; codecs="vorbis"');
    expect(audioMimeTypeForPath('assets/a.M4A')).toBe('audio/mp4; codecs="mp4a.40.2"');
    expect(audioMimeTypeForPath('assets/a.wav')).toBeUndefined();
  });
});

describe('createAudioFormatSupport', () => {
  it('treats WAV as always playable without asking the probe', () => {
    const probe = vi.fn(() => '');
    const isPlayable = createAudioFormatSupport(probe);

    expect(isPlayable('assets/ui_click.wav')).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it('asks once per mime type and remembers the answer', () => {
    const probe = vi.fn((mimeType: string) => (mimeType.startsWith('audio/ogg') ? '' : 'maybe'));
    const isPlayable = createAudioFormatSupport(probe);

    expect(isPlayable('a/x.ogg')).toBe(false);
    expect(isPlayable('a/y.ogg')).toBe(false);
    expect(isPlayable('a/x.m4a')).toBe(true);
    expect(probe).toHaveBeenCalledTimes(2);
  });
});

describe('createDomCanPlayTypeProbe', () => {
  it('reports every format playable when there is no DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(createDomCanPlayTypeProbe()('audio/ogg; codecs="vorbis"')).toBe('probably');
  });
});

describe('resolveSoundClipUrl', () => {
  it('serves the OGG ambience where Vorbis decodes', () => {
    expect(resolveSoundClipUrl('ambient.map', () => true)).toBe(
      '/assets/audio/sfx/ambient/ambient_map_01.ogg',
    );
  });

  it('serves the AAC fallback where Vorbis does not decode (Safari, iOS)', () => {
    const noVorbis = (assetPath: string) => !assetPath.endsWith('.ogg');

    expect(resolveSoundClipUrl('ambient.map', noVorbis)).toBe(
      '/assets/audio/sfx/ambient/ambient_map_01.m4a',
    );
    expect(resolveSoundClipUrl('ambient.tension', noVorbis)).toBe(
      '/assets/audio/sfx/ambient/ambient_tension_01.m4a',
    );
  });

  it('never consults the probe for clips without a fallback', () => {
    const probe = vi.fn(() => false);

    expect(resolveSoundClipUrl('ui.click', probe)).toBe(`/${SOUND_CLIPS['ui.click'].assetPath}`);
    expect(probe).not.toHaveBeenCalled();
  });
});
