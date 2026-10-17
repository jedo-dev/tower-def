import { memo, useEffect } from 'react';
import type { SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { mapWaveTowerInfo } from '../model/mapWaveTowerInfo';
import styles from './WaveTowerInfoBar.module.css';

export type WaveTowerInfoBarProps = {
  tower: SelectedTowerSnapshot;
  onClose: () => void;
};

const ESCAPE_KEY = 'Escape';

/**
 * The tower selected while the wave runs, as one read-only line. The engine
 * only upgrades, sells and develops towers in the build phase, so the sheet
 * and its actions wait for the wave to settle; the dock stays folded.
 */
function WaveTowerInfoBarComponent({ tower, onClose }: WaveTowerInfoBarProps) {
  const info = mapWaveTowerInfo(tower);

  // Escape closes the line like it closes the sheet, and is marked handled so
  // the match shortcut does not also ask to quit.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== ESCAPE_KEY || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <section className={styles.bar} aria-label="Selected tower" data-wave-tower-info="">
      <p className={styles.line} role="status" aria-label={info.ariaLabel}>
        <span className={styles.name}>{info.name}</span>
        <span className={styles.detail}>{info.detail}</span>
        <span className={styles.note}>{info.note}</span>
      </p>
      <button
        type="button"
        className={styles.close}
        aria-label="Close tower info"
        onClick={onClose}
      >
        <span aria-hidden="true">×</span>
      </button>
    </section>
  );
}

export const WaveTowerInfoBar = memo(WaveTowerInfoBarComponent);
