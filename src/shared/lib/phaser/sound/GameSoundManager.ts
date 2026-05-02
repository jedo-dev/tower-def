import Phaser from 'phaser';

export type GameSoundEvent = 'attack' | 'hit' | 'death';

type SoundConfig = {
  key: string;
  volume: number;
};

const SOUND_CONFIG_BY_EVENT: Record<GameSoundEvent, SoundConfig> = {
  attack: { key: 'sfx.attack', volume: 0.25 },
  hit: { key: 'sfx.hit', volume: 0.28 },
  death: { key: 'sfx.death', volume: 0.32 },
};

export class GameSoundManager {
  private readonly scene: Phaser.Scene;
  private readonly enabled: boolean;

  constructor(scene: Phaser.Scene, enabled = true) {
    this.scene = scene;
    this.enabled = enabled;
  }

  public play(event: GameSoundEvent): void {
    if (!this.enabled) {
      return;
    }

    const config = SOUND_CONFIG_BY_EVENT[event];
    if (!this.scene.cache.audio.exists(config.key)) {
      return;
    }

    this.scene.sound.play(config.key, { volume: config.volume });
  }
}
