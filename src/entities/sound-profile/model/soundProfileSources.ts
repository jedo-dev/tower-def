import defaultProfile from '../../../content/audio/default.json';
import elfProfile from '../../../content/audio/races/elf.json';
import humanProfile from '../../../content/audio/races/human.json';
import orcProfile from '../../../content/audio/races/orc.json';
import undeadProfile from '../../../content/audio/races/undead.json';
import type { SoundProfileSources } from './loadSoundProfiles';

/** Every authored sound profile. Adding a race means adding its file here. */
export const SOUND_PROFILE_SOURCES: SoundProfileSources = {
  defaultProfile: { file: 'content/audio/default.json', data: defaultProfile },
  races: [
    { file: 'content/audio/races/undead.json', data: undeadProfile },
    { file: 'content/audio/races/orc.json', data: orcProfile },
    { file: 'content/audio/races/human.json', data: humanProfile },
    { file: 'content/audio/races/elf.json', data: elfProfile },
  ],
};
