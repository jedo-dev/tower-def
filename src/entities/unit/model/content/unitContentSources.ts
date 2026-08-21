import elfContent from '../../../../content/units/elf.json';
import humanContent from '../../../../content/units/human.json';
import orcContent from '../../../../content/units/orc.json';
import undeadContent from '../../../../content/units/undead.json';
import type { UnitContentSource } from './loadUnitContent';

/**
 * Every authored creature file, in registry order. Adding a race means adding
 * its file here and nowhere else.
 */
export const UNIT_CONTENT_SOURCES: readonly UnitContentSource[] = [
  { file: 'content/units/undead.json', data: undeadContent },
  { file: 'content/units/orc.json', data: orcContent },
  { file: 'content/units/human.json', data: humanContent },
  { file: 'content/units/elf.json', data: elfContent },
];
