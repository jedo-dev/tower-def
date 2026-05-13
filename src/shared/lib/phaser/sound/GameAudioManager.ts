import Phaser from 'phaser';
import { FactionAudioId, SoundCategory, type SoundId } from './audio.types';
import { AUDIO_CONSTANTS, SOUND_ASSET_PATHS, SOUND_REGISTRY } from './audio.constants';
import type { HudFactionType } from '../../game-bridge/types';

type ActiveSound = {
  sound: Phaser.Sound.BaseSound;
  soundId: SoundId;
  startedAtMs: number;
  category: SoundCategory;
};

type CooldownEntry = {
  lastPlayedAtMs: number;
  playCount: number;
};

export class GameAudioManager {
  private readonly scene: Phaser.Scene;
  private readonly enabled: boolean;
  private masterVolume: number;
  private isUnlocked: boolean = false;
  private activeSounds: ActiveSound[] = [];
  private cooldowns: Map<SoundId, CooldownEntry> = new Map();
  private categoryPlayCounts: Map<SoundCategory, number> = new Map();
  private lastCleanupCheckMs: number = 0;
  private selectedFaction: FactionAudioId = FactionAudioId.UNDEAD;
  private soundKeyById: Map<SoundId, string> = new Map();

  constructor(scene: Phaser.Scene, enabled: boolean = true, masterVolume: number = AUDIO_CONSTANTS.DEFAULT_MASTER_VOLUME) {
    this.scene = scene;
    this.enabled = enabled;
    this.masterVolume = masterVolume;
  }

  public unlock(): void {
    if (this.isUnlocked) {
      return;
    }
    this.isUnlocked = true;
    if (this.scene.sound) {
      this.scene.sound.unlock();
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public setFaction(faction: HudFactionType): void {
    switch (faction) {
      case 'undead':
        this.selectedFaction = FactionAudioId.UNDEAD;
        break;
      case 'orc':
        this.selectedFaction = FactionAudioId.ORC;
        break;
      case 'human':
        this.selectedFaction = FactionAudioId.HUMAN;
        break;
      case 'elf':
        this.selectedFaction = FactionAudioId.ELF;
        break;
      default:
        this.selectedFaction = FactionAudioId.UNDEAD;
    }
  }

  public play(soundId: SoundId, position?: { x: number; y: number }): boolean {
    if (!this.enabled || !this.isUnlocked) {
      return false;
    }

    const config = SOUND_REGISTRY[soundId];
    if (!config) {
      return false;
    }

    if (this.isOnCooldown(soundId, config.cooldownMs)) {
      return false;
    }

    if (!this.canPlayCategory(config.category)) {
      return false;
    }

    if (this.activeSounds.length >= AUDIO_CONSTANTS.MAX_SIMULTANEOUS_SOUNDS) {
      this.cleanupFinishedSounds();
      if (this.activeSounds.length >= AUDIO_CONSTANTS.MAX_SIMULTANEOUS_SOUNDS) {
        return false;
      }
    }

    const played = this.doPlay(soundId, config, position);
    if (!played) {
      this.decrementCategoryCount(config.category);
    }
    return played;
  }

  public playFactionVariant(baseSoundId: SoundId, position?: { x: number; y: number }): boolean {
    const config = SOUND_REGISTRY[baseSoundId];
    if (!config || config.factionTags.length === 0) {
      return this.play(baseSoundId, position);
    }

    const factionVariant = `${baseSoundId}.${this.selectedFaction}` as SoundId;
    if (SOUND_REGISTRY[factionVariant]) {
      return this.play(factionVariant, position);
    }

    return this.play(baseSoundId, position);
  }

  public stopAll(): void {
    this.activeSounds.forEach((active) => {
      if (active.sound.isPlaying) {
        active.sound.stop();
      }
    });
    this.activeSounds = [];
    this.categoryPlayCounts.clear();
  }

  public stopCategory(category: SoundCategory): void {
    const toStop = this.activeSounds.filter((a) => a.category === category);
    toStop.forEach((active) => {
      if (active.sound.isPlaying) {
        active.sound.stop();
      }
    });
    this.activeSounds = this.activeSounds.filter((a) => a.category !== category);
    this.categoryPlayCounts.delete(category);
  }

  public stopSound(soundId: SoundId): void {
    const toStop = this.activeSounds.filter((a) => a.soundId === soundId);
    toStop.forEach((active) => {
      if (active.sound.isPlaying) {
        active.sound.stop();
      }
    });
    this.activeSounds = this.activeSounds.filter((a) => a.soundId !== soundId);
  }

  public isPlaying(soundId: SoundId): boolean {
    return this.activeSounds.some(
      (a) => a.soundId === soundId && a.sound.isPlaying,
    );
  }

  public getActiveCount(): number {
    return this.activeSounds.length;
  }

  private isOnCooldown(soundId: SoundId, cooldownMs: number): boolean {
    if (cooldownMs <= 0) {
      return false;
    }

    const now = this.scene.time.now;
    const entry = this.cooldowns.get(soundId);

    if (entry && now - entry.lastPlayedAtMs < cooldownMs) {
      return true;
    }

    this.cooldowns.set(soundId, {
      lastPlayedAtMs: now,
      playCount: (entry?.playCount ?? 0) + 1,
    });

    return false;
  }

  private canPlayCategory(category: SoundCategory): boolean {
    const currentCount = this.categoryPlayCounts.get(category) ?? 0;
    if (currentCount >= AUDIO_CONSTANTS.MAX_SIMULTANEOUS_SAME_CATEGORY) {
      return false;
    }
    this.categoryPlayCounts.set(category, currentCount + 1);
    return true;
  }

  private doPlay(soundId: SoundId, config: typeof SOUND_REGISTRY[SoundId], position?: { x: number; y: number }): boolean {
    const audioKey = this.getAudioKey(soundId);
    if (!this.scene.cache.audio.exists(audioKey)) {
      return false;
    }

    const pitch = config.pitchMin + Math.random() * (config.pitchMax - config.pitchMin);
    let volume = config.volume * this.masterVolume;

    if (config.spatial && position) {
      const listener = this.scene.cameras.main;
      if (listener) {
        const distance = Phaser.Math.Distance.Between(
          listener.worldView.x,
          listener.worldView.y,
          position.x,
          position.y,
        );
        const maxDistance = Math.max(this.scene.scale.width, this.scene.scale.height);
        const volumeFalloff = Math.max(0, 1 - distance / maxDistance);
        volume = volume * volumeFalloff;
      }
    }

    const sound = this.scene.sound.add(audioKey);

    if (sound) {
      sound.setVolume(volume);
      (sound as unknown as { pitch: number }).pitch = pitch;
      sound.setLoop(config.loop);
    }

    if (sound) {
      sound.play({
        seek: config.startOffsetSec,
        duration: config.maxDurationSec ?? undefined,
      });

      this.activeSounds.push({
        sound,
        soundId,
        startedAtMs: this.scene.time.now,
        category: config.category,
      });

      if (!config.loop) {
        sound.on('end', () => {
          this.removeFinishedSound(sound);
        });
      }
    }

    return true;
  }

  private getAudioKey(soundId: SoundId): string {
    return this.soundKeyById.get(soundId) ?? `audio.${soundId}`;
  }

  private removeFinishedSound(sound: Phaser.Sound.BaseSound): void {
    const index = this.activeSounds.findIndex((a) => a.sound === sound);
    if (index !== -1) {
      const removed = this.activeSounds[index];
      this.activeSounds.splice(index, 1);

      this.decrementCategoryCount(removed.category);
    }
  }

  private decrementCategoryCount(category: SoundCategory): void {
    const categoryCount = this.categoryPlayCounts.get(category) ?? 1;
    this.categoryPlayCounts.set(category, Math.max(0, categoryCount - 1));
  }

  private cleanupFinishedSounds(): void {
    const now = this.scene.time.now;
    if (now - this.lastCleanupCheckMs < AUDIO_CONSTANTS.CLEANUP_CHECK_INTERVAL_MS) {
      return;
    }
    this.lastCleanupCheckMs = now;

    const finished = this.activeSounds.filter((a) => !a.sound.isPlaying);
    finished.forEach((active) => this.removeFinishedSound(active.sound));
  }

  public preload(): void {
    const loadedPathToKey = new Map<string, string>();
    (Object.keys(SOUND_REGISTRY) as SoundId[]).forEach((soundId) => {
      const assetPath = SOUND_ASSET_PATHS[soundId];
      if (!assetPath) {
        return;
      }

      const existingKey = loadedPathToKey.get(assetPath);
      if (existingKey) {
        this.soundKeyById.set(soundId, existingKey);
        return;
      }

      const key = `audio.${soundId}`;
      this.soundKeyById.set(soundId, key);
      loadedPathToKey.set(assetPath, key);

      if (!this.scene.cache.audio.exists(key)) {
        this.scene.load.audio(key, [assetPath]);
      }
    });
  }

  public destroy(): void {
    this.stopAll();
    this.cooldowns.clear();
    this.categoryPlayCounts.clear();
  }
}

export function createGameAudioManager(scene: Phaser.Scene, enabled: boolean = true): GameAudioManager {
  return new GameAudioManager(scene, enabled);
}
