import { loadSoundProfiles } from './loadSoundProfiles';
import type { SoundProfileLibrary } from './soundProfile.types';
import { SOUND_PROFILE_SOURCES } from './soundProfileSources';

/** Validated on module load: a broken profile fails before the first frame. */
export const SOUND_PROFILE_LIBRARY: SoundProfileLibrary = loadSoundProfiles(SOUND_PROFILE_SOURCES);
