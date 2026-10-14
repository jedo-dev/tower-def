import styles from './BestiaryLoadingScreen.module.css';

export const BESTIARY_LOADING_LABEL = 'Opening the bestiary…';

/** Shown while the bestiary chunk (content and cards) downloads. */
export function BestiaryLoadingScreen() {
  return (
    <main className={styles.screen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>{BESTIARY_LOADING_LABEL}</p>
    </main>
  );
}
