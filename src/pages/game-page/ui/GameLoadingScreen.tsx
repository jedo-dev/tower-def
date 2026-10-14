import styles from './GameLoadingScreen.module.css';

export const GAME_LOADING_LABEL = 'Loading battlefield…';

/** Shown while the game chunk (Phaser engine and battlefield UI) downloads. */
export function GameLoadingScreen() {
  return (
    <main className={styles.screen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>{GAME_LOADING_LABEL}</p>
    </main>
  );
}
