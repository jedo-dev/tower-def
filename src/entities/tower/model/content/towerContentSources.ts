import elfContent from '../../../../content/towers/elf.json';
import humanContent from '../../../../content/towers/human.json';
import orcContent from '../../../../content/towers/orc.json';
import undeadContent from '../../../../content/towers/undead.json';
import type { TowerContentSource } from './loadTowerContent';

/**
 * Every authored tower file, in registry order. Adding a race means adding its
 * file here and nowhere else.
 */
export const TOWER_CONTENT_SOURCES: readonly TowerContentSource[] = [
  { file: 'content/towers/undead.json', data: undeadContent },
  { file: 'content/towers/orc.json', data: orcContent },
  { file: 'content/towers/human.json', data: humanContent },
  { file: 'content/towers/elf.json', data: elfContent },
];
