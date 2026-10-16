// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { injectCssModule } from '../../../test/injectCssModule';
import { ToggleSwitch } from './ToggleSwitch';
import styles from './ToggleSwitch.module.css';
import toggleSwitchCss from './ToggleSwitch.module.css?raw';

describe('ToggleSwitch', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let injectedStyles: { remove: () => void } | null = null;

  afterEach(() => {
    cleanup();
    injectedStyles?.remove();
    injectedStyles = null;
    consoleError.mockClear();
  });

  it('is a labelled switch that reports its state through onChange', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch aria-label="Dynamic entrances" checked={false} onChange={onChange} />);

    const control = screen.getByRole('switch', { name: 'Dynamic entrances' });
    expect((control as HTMLInputElement).checked).toBe(false);

    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('is at least one touch target tall and wider than a touch target', () => {
    injectedStyles = injectCssModule(toggleSwitchCss, styles);
    render(<ToggleSwitch aria-label="Dynamic entrances" defaultChecked={false} />);

    const controlStyle = getComputedStyle(screen.getByRole('switch'));
    expect(controlStyle.minHeight).toBe('var(--touch-target-min)');
    expect(controlStyle.height).toBe('var(--touch-target-min)');
    expect(Number.parseInt(controlStyle.minWidth, 10)).toBeGreaterThanOrEqual(44);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
