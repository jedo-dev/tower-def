export type SetupStep = 'builder-race' | 'enemy-faction' | 'difficulty' | 'summary';

/** Wizard order; the progress dashes and the back/next flow both read it. */
export const SETUP_STEPS: readonly SetupStep[] = [
  'builder-race',
  'enemy-faction',
  'difficulty',
  'summary',
];
