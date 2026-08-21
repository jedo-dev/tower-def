import type { GameHudSnapshot, MatchOutcomeStatus } from '../../../shared/lib/game-bridge/types';

export type MatchOutcomeViewModel = {
  isVisible: boolean;
  tone: 'victory' | 'defeat' | 'draw';
  title: string;
  detail: string;
  ariaLabel: string;
};

const FACTION_NAMES: Record<string, string> = {
  undead: 'Undead',
  orc: 'Orc',
  human: 'Human',
  elf: 'Elf',
};

function resolveTone(status: MatchOutcomeStatus): MatchOutcomeViewModel['tone'] {
  if (status === 'player-won') {
    return 'victory';
  }
  return status === 'player-lost' ? 'defeat' : 'draw';
}

export function mapMatchOutcomeToViewModel(snapshot: GameHudSnapshot): MatchOutcomeViewModel {
  const { status, winner } = snapshot.matchOutcome;
  const tone = resolveTone(status);
  const title = tone === 'victory' ? 'Victory' : tone === 'defeat' ? 'Defeat' : 'Draw';

  const winnerName = winner === null ? null : FACTION_NAMES[winner] ?? winner;
  const detail =
    tone === 'draw'
      ? `Both keeps fell on wave ${snapshot.waveNumber}`
      : tone === 'victory'
        ? `${winnerName ?? 'You'} broke through on wave ${snapshot.waveNumber}`
        : `${winnerName ?? 'The enemy'} broke through on wave ${snapshot.waveNumber}`;

  return {
    isVisible: status !== 'active',
    tone,
    title,
    detail,
    ariaLabel: `${title}. ${detail}.`,
  };
}
