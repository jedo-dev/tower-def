import type { GridPosition } from '../../../../shared/types/pathfinding';
import type { DamageNumberState } from '../../scenes/gameScene.types';
import {
  DAMAGE_LABEL_STRING_CACHE_SIZE,
  DAMAGE_NUMBER_EFFECT_FONT_SIZE_PX,
  DAMAGE_NUMBER_HIT_FONT_SIZE_PX,
  DAMAGE_NUMBER_OFFSET_Y_PX,
} from '../../scenes/floatingLabel.constants';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import { acquireFloatingLabel, releaseFloatingLabel } from '../labels/floatingLabelPool';
import { cssHexColorToTint, formatDamageLabel } from '../labels/labelFormatting';
import type { CombatRuntimeConfig, CombatRuntimeDependencies } from './combatRuntimeTypes';
import {
  createRenderRecordPool,
  releasePooledRecord,
  takePooledRecord,
  type RenderRecordPool,
} from './renderRecordPool';
import type { DamageNumberSource, PixelPoint } from './towerCombatTypes';

const damageNumberPool: RenderRecordPool<DamageNumberState> = createRenderRecordPool();

/** Reused cell centre for a new number; read before the next one is spawned. */
const damageNumberCenterPx: PixelPoint = { x: 0, y: 0 };

/** The module-wide damage number record pool; exposed so tests can check reuse. */
export function getDamageNumberPool(): RenderRecordPool<DamageNumberState> {
  return damageNumberPool;
}

/**
 * Floating number over a hit creep; rises and fades over `damageNumberLifetimeMs`.
 * The label is a pooled BitmapText over the shared damage label atlas
 * (tower-def-0zc), so a hit re-lays a few quads instead of rasterising and
 * uploading a text texture. With every label out, the hit shows no number.
 */
export function spawnDamageNumber(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  position: GridPosition,
  damage: number,
  source: DamageNumberSource = 'hit',
): void {
  if (!config.damageNumbersEnabled) {
    return;
  }

  const labels = deps.floatingLabels;
  const label = acquireFloatingLabel(labels);
  if (label === undefined) {
    return;
  }

  const center = damageNumberCenterPx;
  deps.writeCellCenter(position, center);
  const isEffect = source === 'effect';
  const startY = center.y - DAMAGE_NUMBER_OFFSET_Y_PX;
  label.setFontSize(isEffect ? DAMAGE_NUMBER_EFFECT_FONT_SIZE_PX : DAMAGE_NUMBER_HIT_FONT_SIZE_PX);
  label.setText(formatDamageLabel(damage, DAMAGE_LABEL_STRING_CACHE_SIZE));
  label.setTint(
    cssHexColorToTint(isEffect ? config.damageNumberEffectColor : config.damageNumberHitColor),
  );
  label.setPosition(center.x, startY);
  label.setAlpha(1);

  const record = takePooledRecord(damageNumberPool);
  if (record === undefined) {
    battlefield.damageNumbers.push({
      label,
      labels,
      startY,
      remainingMs: config.damageNumberLifetimeMs,
    });
    return;
  }

  record.label = label;
  record.labels = labels;
  record.startY = startY;
  record.remainingMs = config.damageNumberLifetimeMs;
  battlefield.damageNumbers.push(record);
}

/** Rises and fades damage numbers, returns expired labels to their pool and compacts the list in place. */
export function updateDamageNumbers(
  battlefield: BattlefieldRenderState,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  const numbers = battlefield.damageNumbers;
  if (numbers.length === 0) {
    return;
  }

  let writeIndex = 0;

  for (let readIndex = 0; readIndex < numbers.length; readIndex += 1) {
    const numberState = numbers[readIndex];
    const remainingMs = numberState.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      releaseFloatingLabel(numberState.labels, numberState.label);
      releasePooledRecord(damageNumberPool, numberState);
      continue;
    }

    const progress = 1 - remainingMs / config.damageNumberLifetimeMs;
    numberState.label.setAlpha(1 - progress);
    numberState.label.setY(numberState.startY - config.damageNumberRisePx * progress);
    numberState.remainingMs = remainingMs;
    numbers[writeIndex] = numberState;
    writeIndex += 1;
  }

  numbers.length = writeIndex;
}
