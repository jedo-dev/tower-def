// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { resetControlSettingsForTests, setControlSettings } from './controlSettingsStore';
import { useControlSettings } from './useControlSettings';

function ConfirmPlacementProbe() {
  const { confirmPlacementWithSecondTap } = useControlSettings();
  return <output aria-label="confirm placement">{String(confirmPlacementWithSecondTap)}</output>;
}

afterEach(() => {
  cleanup();
  resetControlSettingsForTests();
});

describe('useControlSettings', () => {
  it('starts on and re-renders when the store changes', () => {
    const consoleError = vi.spyOn(console, 'error');
    render(<ConfirmPlacementProbe />);
    const output = screen.getByLabelText('confirm placement');
    expect(output.textContent).toBe('true');

    act(() => setControlSettings({ confirmPlacementWithSecondTap: false }));

    expect(output.textContent).toBe('false');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
