import type { CreepSenderSide } from '../../../../entities/creep';
import { FACTION_ACCENT_COLORS } from '../../../../shared/constants/theme/gameColors';
import { RaceId } from '../../../../shared/types/content-ids';

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
