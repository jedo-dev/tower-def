import type { GridPosition } from '../../../../shared/types/pathfinding';
import type { DamageNumberState } from '../../scenes/gameScene.types';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
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

/** Floating number over a hit creep; rises and fades over `damageNumberLifetimeMs`. */
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

  const center = damageNumberCenterPx;
  deps.writeCellCenter(position, center);
  const text = deps.scene.add.text(center.x, center.y - 10, `${damage}`, {
    fontFamily: 'Exo 2, Segoe UI, Tahoma, sans-serif',
    fontSize: source === 'effect' ? '10px' : '11px',
    color: source === 'effect' ? config.damageNumberEffectColor : config.damageNumberHitColor,
    stroke: '#1d2536',
    strokeThickness: 2,
  });
  text.setOrigin(0.5);

  const record = takePooledRecord(damageNumberPool);
  if (record === undefined) {
    battlefield.damageNumbers.push({
      text,
      startY: text.y,
      remainingMs: config.damageNumberLifetimeMs,
    });
    return;
  }

  record.text = text;
  record.startY = text.y;
  record.remainingMs = config.damageNumberLifetimeMs;
  battlefield.damageNumbers.push(record);
}

/** Rises and fades damage numbers, destroys expired ones and compacts the list in place. */
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
      numberState.text.destroy();
      releasePooledRecord(damageNumberPool, numberState);
      continue;
    }

    const progress = 1 - remainingMs / config.damageNumberLifetimeMs;
    numberState.text.setAlpha(1 - progress);
    numberState.text.setY(numberState.startY - config.damageNumberRisePx * progress);
    numberState.remainingMs = remainingMs;
    numbers[writeIndex] = numberState;
    writeIndex += 1;
  }

  numbers.length = writeIndex;
}
