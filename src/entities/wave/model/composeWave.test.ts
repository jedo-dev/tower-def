import { describe, expect, it } from 'vitest';
import { undeadUnits } from '../../unit';
import { buildWavePreview, composeWave } from './composeWave';
import type { WaveComposition } from './composition';

describe('entities/wave/composeWave', () => {
  const baselineUnits = [undeadUnits[0], undeadUnits[0], undeadUnits[1]];
  const waveId = 'baseline_wave_round_1';
  const round = 1;

  describe('composeWave', () => {
    it('combines baseline units with empty send queues', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits,
        playerSendQueue: [],
        opponentSendQueue: [],
      });

      expect(result.entries).toHaveLength(3);
      expect(result.waveId).toBe(waveId);
      expect(result.round).toBe(round);
    });

    it('marks baseline entries with baseline source', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits,
        playerSendQueue: [],
        opponentSendQueue: [],
      });

      for (const entry of result.entries) {
        expect(entry.source).toBe('baseline');
      }
    });

    it('appends player send queue after baseline', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits,
        playerSendQueue: ['undead_ghoul', 'undead_crypt_fiend'],
        opponentSendQueue: [],
      });

      expect(result.entries).toHaveLength(5);
      expect(result.entries[3].unit.id).toBe('undead_ghoul');
      expect(result.entries[3].source).toBe('player-send');
      expect(result.entries[4].unit.id).toBe('undead_crypt_fiend');
      expect(result.entries[4].source).toBe('player-send');
    });

    it('appends opponent send queue after player sends', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits,
        playerSendQueue: ['undead_ghoul'],
        opponentSendQueue: ['orc_grunt', 'orc_wolf_rider'],
      });

      expect(result.entries).toHaveLength(6);
      expect(result.entries[4].unit.id).toBe('orc_grunt');
      expect(result.entries[4].source).toBe('opponent-send');
      expect(result.entries[5].unit.id).toBe('orc_wolf_rider');
      expect(result.entries[5].source).toBe('opponent-send');
    });

    it('resolves UnitId to full UnitConfig', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits: [],
        playerSendQueue: ['undead_skeleton'],
        opponentSendQueue: [],
      });

      const entry = result.entries[0];
      expect(entry.unit.id).toBe('undead_skeleton');
      expect(entry.unit.name).toBe('Skeleton');
      expect(entry.unit.tier).toBe(1);
      expect(entry.unit.health).toBeGreaterThan(0);
      expect(entry.unit.speed).toBeGreaterThan(0);
    });

    it('is deterministic with same inputs', () => {
      const input = {
        waveId,
        round,
        baselineUnits,
        playerSendQueue: ['undead_ghoul'] as const,
        opponentSendQueue: ['orc_grunt'] as const,
      };

      const result1 = composeWave(input);
      const result2 = composeWave(input);

      expect(result1).toEqual(result2);
    });

    it('handles empty baseline with sends', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits: [],
        playerSendQueue: ['undead_skeleton'],
        opponentSendQueue: ['orc_grunt'],
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].source).toBe('player-send');
      expect(result.entries[1].source).toBe('opponent-send');
    });

    it('handles all empty inputs', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits: [],
        playerSendQueue: [],
        opponentSendQueue: [],
      });

      expect(result.entries).toHaveLength(0);
    });

    it('preserves order within each source group', () => {
      const result = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[0], undeadUnits[1], undeadUnits[2]],
        playerSendQueue: ['undead_ghoul', 'undead_skeleton'],
        opponentSendQueue: ['orc_wolf_rider', 'orc_grunt'],
      });

      expect(result.entries[0].unit.id).toBe('undead_skeleton');
      expect(result.entries[1].unit.id).toBe('undead_ghoul');
      expect(result.entries[2].unit.id).toBe('undead_crypt_fiend');
      expect(result.entries[3].unit.id).toBe('undead_ghoul');
      expect(result.entries[4].unit.id).toBe('undead_skeleton');
      expect(result.entries[5].unit.id).toBe('orc_wolf_rider');
      expect(result.entries[6].unit.id).toBe('orc_grunt');
    });
  });

  describe('buildWavePreview', () => {
    it('returns empty summary for empty composition', () => {
      const composition: WaveComposition = {
        waveId,
        round,
        entries: [],
      };

      const preview = buildWavePreview(composition);

      expect(preview.totalCount).toBe(0);
      expect(preview.lines).toHaveLength(0);
      expect(preview.baselineCount).toBe(0);
      expect(preview.playerSendCount).toBe(0);
      expect(preview.opponentSendCount).toBe(0);
    });

    it('counts baseline units correctly', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[0], undeadUnits[0], undeadUnits[0]],
        playerSendQueue: [],
        opponentSendQueue: [],
      });

      const preview = buildWavePreview(composition);

      expect(preview.totalCount).toBe(3);
      expect(preview.baselineCount).toBe(3);
      expect(preview.playerSendCount).toBe(0);
      expect(preview.opponentSendCount).toBe(0);
      expect(preview.lines).toHaveLength(1);
      expect(preview.lines[0].unitId).toBe('undead_skeleton');
      expect(preview.lines[0].count).toBe(3);
      expect(preview.lines[0].source).toBe('baseline');
    });

    it('separates counts by source for same unit type', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[0], undeadUnits[0]],
        playerSendQueue: ['undead_skeleton'],
        opponentSendQueue: [],
      });

      const preview = buildWavePreview(composition);

      expect(preview.totalCount).toBe(3);
      expect(preview.baselineCount).toBe(2);
      expect(preview.playerSendCount).toBe(1);
      expect(preview.lines).toHaveLength(2);
      expect(preview.lines[0].count).toBe(2);
      expect(preview.lines[0].source).toBe('baseline');
      expect(preview.lines[1].count).toBe(1);
      expect(preview.lines[1].source).toBe('player-send');
    });

    it('counts all three sources correctly', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[0], undeadUnits[1]],
        playerSendQueue: ['undead_skeleton', 'undead_ghoul'],
        opponentSendQueue: ['orc_grunt'],
      });

      const preview = buildWavePreview(composition);

      expect(preview.totalCount).toBe(5);
      expect(preview.baselineCount).toBe(2);
      expect(preview.playerSendCount).toBe(2);
      expect(preview.opponentSendCount).toBe(1);
    });

    it('sorts lines by source then tier then name', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[2], undeadUnits[0]],
        playerSendQueue: ['undead_crypt_fiend'],
        opponentSendQueue: ['orc_grunt'],
      });

      const preview = buildWavePreview(composition);

      expect(preview.lines[0].source).toBe('baseline');
      expect(preview.lines[0].tier).toBe(1);
      expect(preview.lines[1].source).toBe('baseline');
      expect(preview.lines[1].tier).toBe(2);
      expect(preview.lines[2].source).toBe('player-send');
      expect(preview.lines[3].source).toBe('opponent-send');
    });

    it('includes unit metadata in preview lines', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [],
        playerSendQueue: ['undead_gargoyle'],
        opponentSendQueue: [],
      });

      const preview = buildWavePreview(composition);

      expect(preview.lines).toHaveLength(1);
      expect(preview.lines[0].unitId).toBe('undead_gargoyle');
      expect(preview.lines[0].name).toBe('Gargoyle');
      expect(preview.lines[0].tier).toBe(3);
      expect(preview.lines[0].count).toBe(1);
    });

    it('preserves waveId and round from composition', () => {
      const composition: WaveComposition = {
        waveId: 'baseline_wave_round_5',
        round: 5,
        entries: [],
      };

      const preview = buildWavePreview(composition);

      expect(preview.waveId).toBe('baseline_wave_round_5');
      expect(preview.round).toBe(5);
    });

    it('handles mixed factions in same wave', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[0]],
        playerSendQueue: ['undead_skeleton'],
        opponentSendQueue: ['orc_grunt', 'orc_wolf_rider'],
      });

      const preview = buildWavePreview(composition);

      expect(preview.totalCount).toBe(4);
      expect(preview.lines.length).toBeGreaterThanOrEqual(3);
    });

    it('preview is deterministic for same composition', () => {
      const composition = composeWave({
        waveId,
        round,
        baselineUnits: [undeadUnits[0], undeadUnits[1]],
        playerSendQueue: ['undead_ghoul'],
        opponentSendQueue: ['orc_grunt'],
      });

      const preview1 = buildWavePreview(composition);
      const preview2 = buildWavePreview(composition);

      expect(preview1).toEqual(preview2);
    });
  });
});
