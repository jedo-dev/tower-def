// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('scene exploded');
  }
  return <p>game surface</p>;
}

function Harness() {
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <ErrorBoundary recoverLabel="Back to menu" onRecover={() => setShouldThrow(false)}>
      <Boom shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
}

describe('ErrorBoundary', () => {
  it('renders children while nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('game surface')).toBeDefined();
  });

  it('shows a recovery UI with the error message instead of a blank screen', () => {
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary recoverLabel="Back to menu" onError={onError}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('scene exploded')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Back to menu' })).toBeDefined();
    expect(onError).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });

  it('recovers and renders children again after the action is pressed', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<Harness />);
    expect(screen.getByRole('alert')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));

    expect(screen.getByText('game surface')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();

    consoleError.mockRestore();
  });
});
