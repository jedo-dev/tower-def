import { BuilderFaction } from '../../../../entities/builder-faction';
import type { HudFactionType } from '../../game-bridge/types';

export enum SoundCategory {
  UI = 'UI',
  COMBAT = 'COMBAT',
  ECONOMY = 'ECONOMY',
  SYSTEM = 'SYSTEM',
  ENVIRONMENT = 'ENVIRONMENT',
  FACTION = 'FACTION',
  AMBIENT = 'AMBIENT',
}

export enum FactionAudioId {
  UNDEAD = 'undead',
  ORC = 'orc',
  HUMAN = 'human',
  ELF = 'elf',
}

export type FactionId = FactionAudioId | BuilderFaction;

export function mapHudFactionToAudioFaction(faction: HudFactionType): FactionAudioId {
  switch (faction) {
    case 'undead':
      return FactionAudioId.UNDEAD;
    case 'orc':
      return FactionAudioId.ORC;
    case 'human':
      return FactionAudioId.HUMAN;
    case 'elf':
      return FactionAudioId.ELF;
    default:
      return FactionAudioId.UNDEAD;
  }
}

export function mapBuilderFactionToAudioFaction(faction: BuilderFaction): FactionAudioId {
  switch (faction) {
    case BuilderFaction.UNDEAD:
      return FactionAudioId.UNDEAD;
    case BuilderFaction.ORC:
      return FactionAudioId.ORC;
    case BuilderFaction.HUMAN:
      return FactionAudioId.HUMAN;
    case BuilderFaction.ELF:
      return FactionAudioId.ELF;
  }
}

export type SoundId =
  | 'ui.click'
  | 'ui.hover'
  | 'ui.open'
  | 'ui.close'
  | 'ui.error'
  | 'ui.success'
  | 'ui.build_select'
  | 'ui.faction_select'
  | 'ui.wave_start'
  | 'ui.wave_complete'
  | 'ui.game_over'
  | 'ui.victory'
  | 'system.pause'
  | 'system.unpause'
  | 'system.restart'
  | 'economy.gold_gain'
  | 'economy.gold_spent'
  | 'economy.refund'
  | 'economy.life_lost'
  | 'economy.wave_reward'
  | 'combat.tower_attack.archer'
  | 'combat.tower_attack.splash'
  | 'combat.creep_hit'
  | 'combat.creep_death.basic'
  | 'combat.creep_death.elite'
  | 'combat.creep_escape'
  | 'combat.invalid_build'
  | 'combat.successful_build'
  | 'combat.sell_tower'
  | 'ambient.map'
  | 'ambient.tension'
  | 'ambient.faction.undead'
  | 'ambient.faction.orc'
  | 'ambient.faction.human'
  | 'ambient.faction.elf';

export type SoundPlaybackConfig = {
  volume: number;
  pitchMin: number;
  pitchMax: number;
  cooldownMs: number;
  category: SoundCategory;
  loop: boolean;
  spatial: boolean;
  factionTags: FactionAudioId[];
};

export const DEFAULT_SOUND_CONFIG: SoundPlaybackConfig = {
  volume: 0.5,
  pitchMin: 0.95,
  pitchMax: 1.05,
  cooldownMs: 0,
  category: SoundCategory.SYSTEM,
  loop: false,
  spatial: false,
  factionTags: [],
};

export type SoundAssetDefinition = {
  id: SoundId;
  filename: string;
  config: SoundPlaybackConfig;
  usage: string;
  emotion: string;
  suggestedDurationSec: number;
};
