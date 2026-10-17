import type { CreepSenderSide } from '../../../../entities/creep';
import {
  FACTION_ACCENT_COLORS,
  STATUS_COLORS,
} from '../../../../shared/constants/theme/gameColors';
import { RaceId } from '../../../../shared/types/content-ids';
import { CREEP_HEALTH_BAR_WARNING_RATIO } from '../../scenes/creepReadability.constants';

/** Each race's accent token, as the Phaser colour the sender ring is tinted with. */
export const RACE_ACCENT_COLORS: Readonly<Record<RaceId, number>> = {
  [RaceId.UNDEAD]: FACTION_ACCENT_COLORS.undead,
  [RaceId.ORC]: FACTION_ACCENT_COLORS.orc,
  [RaceId.HUMAN]: FACTION_ACCENT_COLORS.human,
  [RaceId.ELF]: FACTION_ACCENT_COLORS.elf,
};

/**
 * Colour of the ring under a sent creep: the accent of the race that sent it.
 * Baseline wave creeps have no sender and get no ring (undefined).
 */
export function resolveSenderRingColor(
  sender: CreepSenderSide | undefined,
  playerRaceId: RaceId,
  opponentRaceId: RaceId,
): number | undefined {
  if (sender === undefined) {
    return undefined;
  }
  return RACE_ACCENT_COLORS[sender === 'player' ? playerRaceId : opponentRaceId];
}

/**
 * Share of health left, 0..1. A creep without a recorded spawn health (bare
 * fixtures) counts as unhurt, like the percent-damage rule does.
 */
export function resolveHealthRatio(hp: number, maxHp: number | undefined): number {
  if (maxHp === undefined || maxHp <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, hp / maxHp));
}

/** The bar stays hidden until the first damage, then stays up even if the creep heals. */
export function isHealthBarShown(healthRatio: number, wasShown: boolean): boolean {
  return wasShown || healthRatio < 1;
}

function mixChannel(from: number, to: number, shift: number, amount: number): number {
  const fromChannel = (from >> shift) & 0xff;
  const toChannel = (to >> shift) & 0xff;
  return Math.round(fromChannel + (toChannel - fromChannel) * amount) << shift;
}

function mixColor(from: number, to: number, amount: number): number {
  return (
    mixChannel(from, to, 16, amount) |
    mixChannel(from, to, 8, amount) |
    mixChannel(from, to, 0, amount)
  );
}

/**
 * Health ramp from the success token (full) through the warning token (at
 * `CREEP_HEALTH_BAR_WARNING_RATIO`) to the danger token (empty).
 */
export function resolveHealthBarColor(healthRatio: number): number {
  const ratio = Math.min(1, Math.max(0, healthRatio));
  if (ratio >= CREEP_HEALTH_BAR_WARNING_RATIO) {
    const amount = (1 - ratio) / (1 - CREEP_HEALTH_BAR_WARNING_RATIO);
    return mixColor(STATUS_COLORS.success, STATUS_COLORS.warning, amount);
  }
  return mixColor(
    STATUS_COLORS.danger,
    STATUS_COLORS.warning,
    ratio / CREEP_HEALTH_BAR_WARNING_RATIO,
  );
}
