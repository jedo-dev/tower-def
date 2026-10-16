import { describe, expect, it } from 'vitest';
import { getNextSetupStep, getPreviousSetupStep } from './setupSteps';

describe('setup step navigation', () => {
  it('walks forward through the wizard and stops after the summary', () => {
    expect(getNextSetupStep('builder-race')).toBe('enemy-faction');
    expect(getNextSetupStep('enemy-faction')).toBe('difficulty');
    expect(getNextSetupStep('difficulty')).toBe('summary');
    expect(getNextSetupStep('summary')).toBeNull();
  });

  it('walks back through the wizard and stops before the race step', () => {
    expect(getPreviousSetupStep('summary')).toBe('difficulty');
    expect(getPreviousSetupStep('difficulty')).toBe('enemy-faction');
    expect(getPreviousSetupStep('enemy-faction')).toBe('builder-race');
    expect(getPreviousSetupStep('builder-race')).toBeNull();
  });
});
