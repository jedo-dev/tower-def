import { memo, useState, type CSSProperties } from 'react';
import styles from './FactionEmblem.module.css';
import type { RaceId } from '../../../types/content-ids';
import { RACE_DISPLAY_NAMES, toFactionEmblemSource } from '../model/toFactionEmblemSource';

export type FactionEmblemProps = {
  race: RaceId;
  /** Rendered side in px; the emblem is square. */
  size: number;
  /** Set when a visible race name sits next to the emblem, so it is not announced twice. */
  decorative?: boolean;
  className?: string;
};

function joinClassNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Shows the race emblem cut by tools/slice-portraits.py. If the file fails to
 * load it falls back to the race's initial letter, so a menu never shows a
 * broken image.
 */
function FactionEmblemComponent({ race, size, decorative = false, className }: FactionEmblemProps) {
  const [failedRace, setFailedRace] = useState<RaceId | null>(null);
  const name = RACE_DISPLAY_NAMES[race];
  const style = { '--faction-emblem-size': `${size}px` } as CSSProperties;

  if (failedRace === race) {
    return (
      <span
        className={joinClassNames(styles.emblem, styles.fallback, className)}
        style={style}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : name}
        aria-hidden={decorative ? true : undefined}
      >
        <span aria-hidden="true">{name.charAt(0)}</span>
      </span>
    );
  }

  return (
    <img
      className={joinClassNames(styles.emblem, className)}
      style={style}
      src={toFactionEmblemSource(race)}
      alt={decorative ? '' : name}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      onError={() => setFailedRace(race)}
    />
  );
}

export const FactionEmblem = memo(FactionEmblemComponent);
