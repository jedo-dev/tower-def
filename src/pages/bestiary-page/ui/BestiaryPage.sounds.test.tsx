// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BestiaryPage } from './BestiaryPage';
import {
  SOUND_PROFILE_LIBRARY,
  resolveCreepSound,
  resolveTowerSound,
} from '../../../entities/sound-profile';
import { resolveUnitConfigById } from '../../../entities/unit';
import { resolveBuildableTowerById } from '../../../entities/tower';
import { CreepSoundSlot, TowerSoundSlot } from '../../../shared/types/sound-ids';

const preview = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }));

vi.mock('../../../shared/lib/audio/soundPreview', () => ({ menuSoundPreview: preview }));

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
  preview.play.mockClear();
  preview.stop.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function openOrcCard(name: string): ReturnType<typeof within> {
  render(<BestiaryPage onNavigate={() => undefined} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Orc' }));
  fireEvent.click(screen.getByRole('button', { name }));
  return within(screen.getByRole('dialog', { name }));
}

describe('BestiaryPage listen buttons', () => {
  it('plays the resolved hit, death, escape and spawn clips of a creature', () => {
    const grunt = resolveUnitConfigById('orc_grunt');
    const dialog = openOrcCard(grunt.name);
    const cues = [
      ['hit', CreepSoundSlot.HIT],
      ['death', CreepSoundSlot.DEATH],
      ['escape', CreepSoundSlot.ESCAPE],
      ['spawn', CreepSoundSlot.SPAWN],
    ] as const;

    for (const [cue, slot] of cues) {
      fireEvent.click(dialog.getByRole('button', { name: `Play ${grunt.name} ${cue} sound` }));
      expect(preview.play).toHaveBeenLastCalledWith(
        resolveCreepSound(SOUND_PROFILE_LIBRARY, grunt.faction, grunt.sounds, slot),
      );
    }
    expect(preview.play).toHaveBeenCalledTimes(cues.length);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('plays the resolved attack and impact clips of a tower', () => {
    const tower = resolveBuildableTowerById('orc_spear_watchtower');
    const dialog = openOrcCard(tower.name);

    fireEvent.click(dialog.getByRole('button', { name: `Play ${tower.name} attack sound` }));
    expect(preview.play).toHaveBeenLastCalledWith(
      resolveTowerSound(
        SOUND_PROFILE_LIBRARY,
        tower.faction,
        tower.towerType,
        tower.sounds,
        TowerSoundSlot.ATTACK,
      ),
    );
    fireEvent.click(dialog.getByRole('button', { name: `Play ${tower.name} impact sound` }));
    expect(preview.play).toHaveBeenLastCalledWith(
      resolveTowerSound(
        SOUND_PROFILE_LIBRARY,
        tower.faction,
        tower.towerType,
        tower.sounds,
        TowerSoundSlot.IMPACT,
      ),
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('silences the preview when the card closes', () => {
    const grunt = resolveUnitConfigById('orc_grunt');
    openOrcCard(grunt.name);

    cleanup();

    expect(preview.stop).toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
