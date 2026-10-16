import type { KeyboardEvent } from 'react';

const NEXT_KEYS: ReadonlySet<string> = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowUp']);

/**
 * WAI-ARIA radio group keys: arrows move the selection (wrapping), Home/End
 * jump to the ends. Returns null for keys the group does not handle.
 */
export function getRadioGroupTargetIndex(
  key: string,
  currentIndex: number,
  optionCount: number,
): number | null {
  if (optionCount <= 0) {
    return null;
  }
  const safeIndex = currentIndex >= 0 && currentIndex < optionCount ? currentIndex : 0;
  if (NEXT_KEYS.has(key)) {
    return (safeIndex + 1) % optionCount;
  }
  if (PREVIOUS_KEYS.has(key)) {
    return (safeIndex - 1 + optionCount) % optionCount;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return optionCount - 1;
  }
  return null;
}

/**
 * Key handler for a `role="radiogroup"` element whose options are
 * `role="radio"` children in `options` order: selects the target option and
 * moves focus to it (the roving tabindex lives on the options).
 */
export function handleRadioGroupKeyDown<TOption>(
  event: KeyboardEvent<HTMLElement>,
  options: readonly TOption[],
  selected: TOption,
  onSelect: (option: TOption) => void,
): void {
  const targetIndex = getRadioGroupTargetIndex(
    event.key,
    options.indexOf(selected),
    options.length,
  );
  if (targetIndex === null) {
    return;
  }
  event.preventDefault();
  onSelect(options[targetIndex]);
  const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
  radios[targetIndex]?.focus();
}
