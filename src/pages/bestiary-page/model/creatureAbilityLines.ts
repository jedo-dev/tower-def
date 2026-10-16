import type {
  CreatureAbilities,
  CreatureEffectResistance,
  CreatureIncomingDamageMultipliers,
  CreatureSecondLife,
} from '../../../shared/types/creatureAbilities';
import { EFFECT_IDS, EffectId } from '../../../shared/types/content-ids';
import { formatPercent, formatSeconds } from './towerEffectLines';

/**
 * Plain-language line of the creature abilities a talent grade grants, for the
 * bestiary's creature branch tables. Pure display text, no game rules.
 */

export const NO_CREATURE_SPECIAL = '—';

const EFFECT_LABELS: Record<EffectId, string> = {
  [EffectId.CHILL]: 'slow',
  [EffectId.STUN]: 'stun',
  [EffectId.POISON]: 'poison',
  [EffectId.BURN]: 'burn',
  [EffectId.ARMOR_BREAK]: 'armor break',
  [EffectId.VULNERABILITY]: 'vulnerability',
};

const TOWER_HIT_SHAPES = ['single', 'splash', 'chain'] as const;

const DAMAGE_KEY_LABELS: Record<keyof CreatureIncomingDamageMultipliers, string> = {
  single: 'single',
  splash: 'splash',
  chain: 'chain',
  dot: 'damage over time',
  percent: 'percent',
};

function formatMultiplier(multiplier: number): string {
  return `x${Number(multiplier.toFixed(2))}`;
}

function formatOrdinal(value: number): string {
  if (value === 2) return '2nd';
  if (value === 3) return '3rd';
  return `${value}th`;
}

function describeResistanceValue(label: string, value: number): string {
  return value === 0 ? `immune to ${label}` : `${label} ${formatMultiplier(value)}`;
}

function describeEffectResistance(resistance: CreatureEffectResistance): string[] {
  const values = EFFECT_IDS.map((effectId) => resistance[effectId]);
  const first = values[0];
  if (first !== undefined && values.every((value) => value === first)) {
    return [describeResistanceValue('all effects', first)];
  }
  return EFFECT_IDS.flatMap((effectId) => {
    const value = resistance[effectId];
    return value === undefined ? [] : [describeResistanceValue(EFFECT_LABELS[effectId], value)];
  });
}

/** Groups the damage keys that share a multiplier: "single, splash damage x0.82". */
function describeIncomingDamage(multipliers: CreatureIncomingDamageMultipliers): string[] {
  const allTowerHits = TOWER_HIT_SHAPES.map((shape) => multipliers[shape]);
  const sharedTowerHit = allTowerHits[0];
  const towerHitsShared =
    sharedTowerHit !== undefined && allTowerHits.every((value) => value === sharedTowerHit);
  const parts: string[] = [];
  const groups = new Map<number, string[]>();

  if (towerHitsShared) {
    parts.push(`tower damage ${formatMultiplier(sharedTowerHit)}`);
  }
  for (const key of Object.keys(DAMAGE_KEY_LABELS) as (keyof CreatureIncomingDamageMultipliers)[]) {
    const value = multipliers[key];
    const coveredByTowerHits = towerHitsShared && key !== 'dot' && key !== 'percent';
    if (value === undefined || coveredByTowerHits) continue;
    groups.set(value, [...(groups.get(value) ?? []), DAMAGE_KEY_LABELS[key]]);
  }
  for (const [value, labels] of groups) {
    parts.push(`${labels.join(', ')} damage ${formatMultiplier(value)}`);
  }
  return parts;
}

function describeSecondLife(secondLife: CreatureSecondLife): string {
  const speed =
    secondLife.speedMultiplier === undefined
      ? ''
      : `, speed ${formatMultiplier(secondLife.speedMultiplier)}`;
  const chill = secondLife.immuneToChill === true ? ', immune to slow' : '';
  return `revives once at ${formatPercent(secondLife.hpShare)} HP${speed}${chill}`;
}

function describeDefense(abilities: CreatureAbilities): string[] {
  const parts: string[] = [];
  if (abilities.effectResistance !== undefined) {
    parts.push(...describeEffectResistance(abilities.effectResistance));
  }
  if (abilities.dodgeEveryNthShot !== undefined) {
    parts.push(`every ${formatOrdinal(abilities.dodgeEveryNthShot)} single shot misses`);
  }
  if (abilities.incomingDamageMultipliers !== undefined) {
    parts.push(...describeIncomingDamage(abilities.incomingDamageMultipliers));
  }
  if (abilities.healthRegenPerSecond !== undefined) {
    const paused = abilities.regenPausedByPoison === true ? ' (poison stops it)' : '';
    parts.push(`+${abilities.healthRegenPerSecond} HP/s${paused}`);
  }
  if (abilities.shieldHp !== undefined) {
    const recharge =
      abilities.shieldRechargeMs === undefined
        ? ''
        : `, refills after ${formatSeconds(abilities.shieldRechargeMs)}`;
    parts.push(`${abilities.shieldHp} HP shield${recharge}`);
  }
  if (abilities.secondLife !== undefined) {
    parts.push(describeSecondLife(abilities.secondLife));
  }
  return parts;
}

function describeMovement(abilities: CreatureAbilities): string[] {
  const parts: string[] = [];
  const lowHealth = abilities.speedBoostBelowHpShare;
  const routeEnd = abilities.speedBoostLastRouteShare;
  if (lowHealth !== undefined) {
    parts.push(
      `below ${formatPercent(lowHealth.hpShare)} HP speed ${formatMultiplier(lowHealth.speedMultiplier)}`,
    );
  }
  if (routeEnd !== undefined) {
    parts.push(
      `last ${formatPercent(routeEnd.routeShare)} of the route speed ${formatMultiplier(routeEnd.speedMultiplier)}`,
    );
  }
  if (abilities.startInvisibleMs !== undefined) {
    parts.push(`invisible for ${formatSeconds(abilities.startInvisibleMs)} after spawn`);
  }
  return parts;
}

function describeEconomy(abilities: CreatureAbilities): string[] {
  const parts: string[] = [];
  if (abilities.leakLivesTaken !== undefined) {
    parts.push(`a leak takes ${abilities.leakLivesTaken} lives`);
  }
  if (abilities.leakGoldToSender !== undefined) {
    parts.push(`a leak pays the sender ${abilities.leakGoldToSender}g`);
  }
  if (abilities.killGoldPenaltyToDefender !== undefined) {
    parts.push(`a kill costs the defender ${abilities.killGoldPenaltyToDefender}g`);
  }
  if (abilities.freeNthSend !== undefined) {
    parts.push(`every ${formatOrdinal(abilities.freeNthSend)} send is free`);
  }
  return parts;
}

export function describeCreatureAbilities(abilities: CreatureAbilities | undefined): string {
  if (abilities === undefined) {
    return NO_CREATURE_SPECIAL;
  }
  const parts = [
    ...describeDefense(abilities),
    ...describeMovement(abilities),
    ...describeEconomy(abilities),
  ];
  return parts.length > 0 ? parts.join('; ') : NO_CREATURE_SPECIAL;
}
