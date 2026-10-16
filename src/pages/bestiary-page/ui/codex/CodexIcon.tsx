import { CODEX_ICON_PATHS, type CodexIconName } from './codexIconPaths';
import styles from './Codex.module.css';

export type CodexIconSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<CodexIconSize, string | undefined> = {
  xs: styles.iconXs,
  sm: styles.iconSm,
  md: undefined,
  lg: styles.iconLg,
};

const TINT_CLASS: Partial<Record<CodexIconName, string>> = {
  physical: styles.tintPhysical,
  magical: styles.tintMagical,
  percent: styles.tintPercent,
  range: styles.tintRange,
  reload: styles.tintReload,
  health: styles.tintHealth,
  speed: styles.tintSpeed,
  physicalArmor: styles.tintPhysicalArmor,
  magicalArmor: styles.tintMagicalArmor,
  gold: styles.tintGold,
  income: styles.tintIncome,
};

export type CodexIconProps = {
  name: CodexIconName;
  size?: CodexIconSize;
  /** Stat pictograms carry their stat tint; set false to inherit the text colour. */
  tinted?: boolean;
  className?: string;
};

/** A decorative line pictogram; the owning element carries the accessible text. */
export function CodexIcon({ name, size = 'md', tinted = true, className }: CodexIconProps) {
  const classNames = [styles.icon, SIZE_CLASS[size], tinted && TINT_CLASS[name], className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg className={classNames} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {CODEX_ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
