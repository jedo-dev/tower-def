// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MUTE_TOGGLE_LABEL, SettingsPage, type SettingsPageProps } from './SettingsPage';

function renderSettings(overrides: Partial<SettingsPageProps> = {}) {
  const props: SettingsPageProps = {
    onNavigate: vi.fn(),
    sfxVolume: 0.2,
    ambientVolume: 0.15,
    isMuted: false,
    onSfxVolumeChange: vi.fn(),
    onAmbientVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    ...overrides,
  };
  render(<SettingsPage {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
});

describe('SettingsPage', () => {
  it('exposes a mute toggle with pressed state and keeps the slider values', () => {
    const consoleError = vi.spyOn(console, 'error');
    const props = renderSettings({ isMuted: true, sfxVolume: 0.6, ambientVolume: 0.3 });

    const muteButton = screen.getByRole('button', { name: MUTE_TOGGLE_LABEL });
    expect(muteButton.getAttribute('aria-pressed')).toBe('true');
    expect(muteButton.className).toContain('settings-mute-button');
    expect(screen.getByRole('status').textContent).toContain('muted');
    expect((screen.getByLabelText('Sound Effects') as HTMLInputElement).value).toBe('60');
    expect((screen.getByLabelText('Ambient Music') as HTMLInputElement).value).toBe('30');

    fireEvent.click(muteButton);
    expect(props.onMuteToggle).toHaveBeenCalledTimes(1);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('reports slider changes as 0..1 volumes and navigates back', () => {
    const consoleError = vi.spyOn(console, 'error');
    const props = renderSettings();

    expect(
      screen.getByRole('button', { name: MUTE_TOGGLE_LABEL }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.change(screen.getByLabelText('Sound Effects'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Ambient Music'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(props.onSfxVolumeChange).toHaveBeenCalledWith(0.45);
    expect(props.onAmbientVolumeChange).toHaveBeenCalledWith(0.8);
    expect(props.onNavigate).toHaveBeenCalledWith('start');

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
