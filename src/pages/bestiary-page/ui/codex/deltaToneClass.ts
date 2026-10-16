import type { StatDeltaViewModel } from '../../model/types';
import styles from './Codex.module.css';

const DELTA_TONE_CLASS: Record<StatDeltaViewModel['tone'], string> = {
  good: styles.good,
  bad: styles.bad,
  neutral: styles.neutral,
};

export function deltaToneClass(tone: StatDeltaViewModel['tone']): string {
  return DELTA_TONE_CLASS[tone];
}
