export type { SoundId } from '../../types/sound-ids';

export enum SoundCategory {
  UI = 'UI',
  COMBAT = 'COMBAT',
  ECONOMY = 'ECONOMY',
  SYSTEM = 'SYSTEM',
  AMBIENT = 'AMBIENT',
}

export type SoundPlaybackConfig = {
  volume: number;
  pitchMin: number;
  pitchMax: number;
  cooldownMs: number;
  maxDurationSec: number | null;
  startOffsetSec: number;
  category: SoundCategory;
  loop: boolean;
  spatial: boolean;
};

/** One registered clip: how it plays and the single file it plays from. */
export type SoundClipDefinition = SoundPlaybackConfig & {
  /** Path under `public/`, e.g. `assets/audio/sfx/ui/ui_click_01.wav`. */
  assetPath: string;
};

export const DEFAULT_SOUND_CONFIG: SoundPlaybackConfig = {
  volume: 0.5,
  pitchMin: 0.95,
  pitchMax: 1.05,
  cooldownMs: 0,
  maxDurationSec: null,
  startOffsetSec: 0,
  category: SoundCategory.SYSTEM,
  loop: false,
  spatial: false,
};
