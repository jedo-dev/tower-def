import { SoundCategory } from '../audio.types';
import { defineClip, type SoundClipGroup } from './defineClip';

const UI = SoundCategory.UI;

/** Interface cues repeat often: keep their pitch steady and their tails short. */
const STEADY = { pitchMin: 0.98, pitchMax: 1.02 } as const;

/** Stingers are composed in key; detuning them would sour the chord. */
const IN_KEY = { pitchMin: 1, pitchMax: 1 } as const;

export const UI_SOUND_CLIPS: SoundClipGroup<'ui'> = {
  'ui.click': defineClip('ui/ui_click.wav', UI, { ...STEADY, volume: 0.3, cooldownMs: 50 }),
  'ui.hover': defineClip('ui/ui_hover.wav', UI, { ...STEADY, volume: 0.15, cooldownMs: 100 }),
  'ui.open': defineClip('ui/ui_open.wav', UI, { ...STEADY, volume: 0.25 }),
  'ui.close': defineClip('ui/ui_close.wav', UI, { ...STEADY, volume: 0.25 }),
  'ui.error': defineClip('ui/ui_error.wav', UI, { ...STEADY, volume: 0.3, cooldownMs: 120 }),
  'ui.success': defineClip('ui/ui_success.wav', UI, { ...IN_KEY, volume: 0.28 }),
  'ui.build_select': defineClip('ui/ui_build_select.wav', UI, { ...STEADY, volume: 0.22 }),
  'ui.faction_select': defineClip('ui/ui_faction_select.wav', UI, { ...IN_KEY, volume: 0.28 }),
  'ui.wave_start': defineClip('ui/ui_wave_start.wav', UI, { ...IN_KEY, volume: 0.38 }),
  'ui.wave_complete': defineClip('ui/ui_wave_complete.wav', UI, { ...IN_KEY, volume: 0.32 }),
  'ui.game_over': defineClip('ui/ui_game_over.wav', UI, { ...IN_KEY, volume: 0.42 }),
  'ui.victory': defineClip('ui/ui_victory.wav', UI, { ...IN_KEY, volume: 0.42 }),
};
