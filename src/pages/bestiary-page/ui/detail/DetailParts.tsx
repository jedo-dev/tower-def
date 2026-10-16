import { useId, useState, type ReactNode } from 'react';
import type { TowerLevelViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { SectionHead } from '../codex/SectionHead';
import { deltaToneClass } from '../codex/deltaToneClass';
import codex from '../codex/Codex.module.css';
import styles from './Detail.module.css';
import sections from './Sections.module.css';

export type DetailHeaderProps = {
  nameId: string;
  name: string;
  portrait: ReactNode;
  /** Tag chips under the name; the first may be the gold tier tag. */
  tags: readonly { key: string; label: string; tone?: 'tier' | 'race'; icon?: ReactNode }[];
};

const TAG_TONE_CLASS = { tier: styles.tagTier, race: styles.tagRace } as const;

/** Framed portrait, gold name (the dialog's label) and trait tags. */
export function DetailHeader({ nameId, name, portrait, tags }: DetailHeaderProps) {
  return (
    <section
      className={`${codex.frame} ${codex.frameGlow} ${codex.rivets} ${styles.header}`}
      aria-labelledby={nameId}
    >
      {portrait}
      <div className={styles.identity}>
        <h2 id={nameId} className={styles.name}>
          {name}
        </h2>
        <ul className={styles.tags} aria-label="Traits">
          {tags.map((tag) => (
            <li
              key={tag.key}
              className={tag.tone ? `${styles.tag} ${TAG_TONE_CLASS[tag.tone]}` : styles.tag}
            >
              {tag.icon}
              {tag.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Rune-marked lines for traits that are not numbers (splash, chain, abilities). */
export function SpecialLines({ label, lines }: { label: string; lines: readonly string[] }) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <ul className={styles.specials} aria-label={label}>
      {lines.map((line) => (
        <li key={line} className={styles.special}>
          <span className={styles.rune} aria-hidden="true" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

/** Level 1-3 of a tower side by side, each stat with its change from the level before. */
export function LevelColumns({
  idPrefix,
  levels,
}: {
  idPrefix: string;
  levels: readonly TowerLevelViewModel[];
}) {
  const headingId = `${idPrefix}-levels`;
  const lastLevel = levels[levels.length - 1]?.level ?? 1;
  const extras = levels
    .filter((level) => level.level > 1 && level.special !== null)
    .map((level) => `L${level.level} · ${level.special}`);

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <SectionHead id={headingId} title="Level-ups" meta={`L1–L${lastLevel}`} level={3} />
      <ol className={sections.levels} aria-label="Upgrade levels">
        {levels.map((level) => (
          <li key={level.level} className={`${codex.frame} ${codex.frameFlat} ${sections.level}`}>
            <div className={sections.levelHead}>
              <h4 className={sections.levelName}>{`L${level.level}`}</h4>
              <span
                className={sections.price}
                title={level.upgradeCost === null ? 'Build cost' : 'Upgrade cost'}
              >
                <CodexIcon name="gold" size="sm" />
                <span className={codex.visuallyHidden}>
                  {level.upgradeCost === null ? 'Build cost: ' : 'Upgrade cost: '}
                </span>
                {level.cost}
              </span>
            </div>
            <ul className={sections.readings}>
              {level.stats.map((stat) => (
                <li key={stat.key} className={sections.reading} title={stat.label}>
                  <CodexIcon name={stat.key} size="sm" />
                  <span className={codex.visuallyHidden}>{`${stat.label}: `}</span>
                  {stat.value}
                  {stat.delta && (
                    <span className={`${sections.readingDelta} ${deltaToneClass(stat.delta.tone)}`}>
                      {stat.delta.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <SpecialLines label="Level extras" lines={extras} />
    </section>
  );
}

export type LoreFoldProps = {
  description: string | null;
  lore: string | null;
};

/** Description and lore behind a collapsed "Lore" row. */
export function LoreFold({ description, lore }: LoreFoldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bodyId = useId();
  if (description === null && lore === null) {
    return null;
  }

  return (
    <section className={`${codex.frame} ${sections.fold}${isOpen ? ` ${sections.foldOpen}` : ''}`}>
      <button
        type="button"
        className={sections.foldButton}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          Lore
          <span className={sections.foldHint}>Description &amp; legend</span>
        </span>
        <CodexIcon name="chevronDown" tinted={false} className={sections.foldChevron} />
      </button>
      {isOpen && (
        <div id={bodyId} className={sections.foldBody}>
          {description && <p className={sections.description}>{description}</p>}
          {lore && <p className={sections.lore}>{lore}</p>}
        </div>
      )}
    </section>
  );
}
