import { SoundCategory } from '../audio.types';
import { defineClip, type SoundClipGroup } from './defineClip';

const UI = SoundCategory.UI;

export const UI_SOUND_CLIPS: SoundClipGroup<'ui'> = {
  'ui.click': defineClip('ui/ui_click_01.wav', UI, {
    volume: 0.3,
    cooldownMs: 50,
    maxDurationSec: 0.1,
  }),
  'ui.hover': defineClip('ui/ui_hover_01.wav', UI, {
    volume: 0.15,
    cooldownMs: 100,
    maxDurationSec: 0.05,
  }),
  'ui.open': defineClip('ui/ui_open_01.wav', UI, { volume: 0.25, maxDurationSec: 0.25 }),
  'ui.close': defineClip('ui/ui_close_01.wav', UI, { volume: 0.25, maxDurationSec: 0.25 }),
  'ui.error': defineClip('ui/ui_error_01.wav', UI, {
    volume: 0.35,
    pitchMin: 0.8,
    pitchMax: 0.9,
    maxDurationSec: 0.3,
  }),
  'ui.success': defineClip('ui/ui_success_01.wav', UI, {
    volume: 0.3,
    pitchMin: 1.1,
    pitchMax: 1.2,
    maxDurationSec: 0.25,
  }),
  'ui.build_select': defineClip('ui/ui_build_select_01.wav', UI, {
    volume: 0.2,
    maxDurationSec: 0.15,
  }),
  'ui.faction_select': defineClip('ui/ui_faction_select_01.wav', UI, {
    volume: 0.25,
    maxDurationSec: 0.2,
  }),
  'ui.wave_start': defineClip('ui/ui_wave_start_01.wav', UI, {
    volume: 0.4,
    maxDurationSec: 0.5,
    startOffsetSec: 0.03,
  }),
  'ui.wave_complete': defineClip('ui/ui_wave_complete_01.wav', UI, {
    volume: 0.35,
    maxDurationSec: 0.6,
  }),
  'ui.game_over': defineClip('ui/ui_game_over_01.wav', UI, {
    volume: 0.5,
    pitchMin: 0.7,
    pitchMax: 0.85,
    maxDurationSec: 1.2,
  }),
  'ui.victory': defineClip('ui/ui_victory_01.wav', UI, { volume: 0.45, maxDurationSec: 1.5 }),
};
