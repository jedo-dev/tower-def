import { useEffect } from 'react';
import { menuSoundPreview } from '../../../../shared/lib/audio/soundPreview';
import type { SoundCueViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { SectionHead } from '../codex/SectionHead';
import codex from '../codex/Codex.module.css';
import styles from './Detail.module.css';
import sounds from './SoundCues.module.css';

export type SoundCuesProps = {
  idPrefix: string;
  /** The creature or tower name, for the button labels. */
  name: string;
  cues: readonly SoundCueViewModel[];
};

/**
 * Listen buttons, one per cue. A press plays the clip the game would play,
 * through the menu preview player: once, never autoplayed, and a second
 * press restarts the clip instead of stacking another copy.
 */
export function SoundCues({ idPrefix, name, cues }: SoundCuesProps) {
  const headingId = `${idPrefix}-sounds`;

  // Leaving the card silences a clip that is still playing.
  useEffect(() => () => menuSoundPreview.stop(), []);

  if (cues.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <SectionHead id={headingId} title="Sounds" meta="Tap to listen" level={3} />
      <ul className={sounds.row}>
        {cues.map((cue) => (
          <li key={cue.slot}>
            <button
              type="button"
              className={`${codex.frame} ${codex.frameFlat} ${codex.pressable} ${sounds.button}`}
              aria-label={`Play ${name} ${cue.label.toLowerCase()} sound`}
              title={`${cue.label} sound`}
              data-sound-preview=""
              onClick={() => menuSoundPreview.play(cue.soundId)}
            >
              <CodexIcon name="sound" size="sm" tinted={false} />
              <span className={sounds.label} aria-hidden="true">
                {cue.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
