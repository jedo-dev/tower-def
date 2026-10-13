import type {
  GameHudSnapshot,
  MatchOutcomeReason,
  MatchOutcomeStatus,
} from '../../../shared/lib/game-bridge/types';

export type MatchOutcomeViewModel = {
  isVisible: boolean;
  tone: 'victory' | 'defeat' | 'draw';
  title: string;
  detail: string;
  ariaLabel: string;
};

type MatchOutcomeTone = MatchOutcomeViewModel['tone'];

const FACTION_NAMES: Record<string, string> = {
  undead: 'Undead',
  orc: 'Orc',
  human: 'Human',
  elf: 'Elf',
};

const TITLE_BY_TONE: Readonly<Record<MatchOutcomeTone, string>> = {
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Draw',
};

/** Who the tie-break favoured, as the player reads it. */
const TIE_BREAK_SUBJECT: Readonly<Record<Exclude<MatchOutcomeTone, 'draw'>, string>> = {
  victory: 'you',
  defeat: 'the enemy',
};

function resolveTone(status: MatchOutcomeStatus): MatchOutcomeTone {
  if (status === 'player-won') {
    return 'victory';
  }
  return status === 'player-lost' ? 'defeat' : 'draw';
}

function describeKnockout(
  tone: Exclude<MatchOutcomeTone, 'draw'>,
  winnerName: string | null,
  waveNumber: number,
): string {
  const fallbackName = tone === 'victory' ? 'You' : 'The enemy';
  return `${winnerName ?? fallbackName} broke through on wave ${waveNumber}`;
}

function describeDecisiveOutcome(
  tone: Exclude<MatchOutcomeTone, 'draw'>,
  reason: MatchOutcomeReason | null,
  winnerName: string | null,
  waveNumber: number,
): string {
  const subject = TIE_BREAK_SUBJECT[tone];
  if (reason === 'fewer-leaks') {
    return `Both fell on wave ${waveNumber} — ${subject} leaked fewer`;
  }
  if (reason === 'more-lives') {
    return `Both fell on wave ${waveNumber} with equal leaks — ${subject} had more lives`;
  }
  return describeKnockout(tone, winnerName, waveNumber);
}

export function mapMatchOutcomeToViewModel(snapshot: GameHudSnapshot): MatchOutcomeViewModel {
  const { status, winner, reason } = snapshot.matchOutcome;
  const tone = resolveTone(status);
  const title = TITLE_BY_TONE[tone];

  const winnerName = winner === null ? null : (FACTION_NAMES[winner] ?? winner);
  const detail =
    tone === 'draw'
      ? `Both keeps fell on wave ${snapshot.waveNumber} — dead even`
      : describeDecisiveOutcome(tone, reason, winnerName, snapshot.waveNumber);

  return {
    isVisible: status !== 'active',
    tone,
    title,
    detail,
    ariaLabel: `${title}. ${detail}.`,
  };
}
