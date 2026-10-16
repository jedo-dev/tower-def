import { SETUP_STEPS, type SetupStep } from '../model/setupSteps';

/** Step progress of the wizard: one dash per step, never a carousel index. */
export function SetupProgress({ step }: { step: SetupStep }) {
  const stepIndex = SETUP_STEPS.indexOf(step);

  return (
    <div
      className="setup-progress"
      role="img"
      aria-label={`Step ${stepIndex + 1} of ${SETUP_STEPS.length}`}
    >
      {SETUP_STEPS.map((candidate, index) => (
        <span
          key={candidate}
          data-step={candidate}
          className={`setup-progress-dot${index === stepIndex ? ' setup-progress-dot-active' : ''}${
            index < stepIndex ? ' setup-progress-dot-complete' : ''
          }`}
        />
      ))}
    </div>
  );
}
