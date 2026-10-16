export type SetupStep = 'builder-race' | 'enemy-faction' | 'difficulty' | 'summary';

/** Wizard order; the progress dashes and the back/next flow both read it. */
export const SETUP_STEPS: readonly SetupStep[] = [
  'builder-race',
  'enemy-faction',
  'difficulty',
  'summary',
];

/** The step after `step`, or `null` once the wizard is on its last step. */
export function getNextSetupStep(step: SetupStep): SetupStep | null {
  return SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1] ?? null;
}

/** The step before `step`, or `null` on the first step (leave the wizard). */
export function getPreviousSetupStep(step: SetupStep): SetupStep | null {
  const index = SETUP_STEPS.indexOf(step);
  return index > 0 ? SETUP_STEPS[index - 1] : null;
}
