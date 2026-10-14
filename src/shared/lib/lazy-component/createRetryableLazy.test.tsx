// @vitest-environment jsdom
import { Suspense, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../ui/error-boundary';
import { createRetryableLazy } from './createRetryableLazy';

type GreetingProps = { name: string };

function Greeting({ name }: GreetingProps) {
  return <p>{`hello ${name}`}</p>;
}

function createDeferred<TValue>() {
  let resolveValue: (value: TValue) => void = () => undefined;
  let rejectValue: (error: unknown) => void = () => undefined;
  const promise = new Promise<TValue>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });
  return { promise, resolve: resolveValue, reject: rejectValue };
}

describe('createRetryableLazy', () => {
  it('shows the fallback while the chunk loads, then the component', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const chunk = createDeferred<typeof Greeting>();
    const { Component: LazyGreeting } = createRetryableLazy<GreetingProps>(() => chunk.promise);

    await act(async () => {
      render(
        <Suspense fallback={<p role="status">loading</p>}>
          <LazyGreeting name="menu" />
        </Suspense>,
      );
    });
    expect(screen.getByRole('status').textContent).toBe('loading');

    await act(async () => chunk.resolve(Greeting));

    expect(await screen.findByText('hello menu')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('surfaces a failed chunk to the Error Boundary and retries after recovery', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = vi
      .fn<() => Promise<typeof Greeting>>()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue(Greeting);
    const { Component: LazyGreeting, resetFailedLoad } = createRetryableLazy<GreetingProps>(load);

    function Harness() {
      const [isGameOpen, setIsGameOpen] = useState(true);
      if (!isGameOpen) {
        return (
          <button type="button" onClick={() => setIsGameOpen(true)}>
            Start
          </button>
        );
      }
      return (
        <ErrorBoundary
          recoverLabel="Back to menu"
          onRecover={() => {
            resetFailedLoad();
            setIsGameOpen(false);
          }}
        >
          <Suspense fallback={<p role="status">loading</p>}>
            <LazyGreeting name="retry" />
          </Suspense>
        </ErrorBoundary>
      );
    }

    await act(async () => {
      render(<Harness />);
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'Failed to fetch dynamically imported module',
    );
    // The failure stays put (no silent retry loop) until the user recovers.
    expect(load).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });

    expect(await screen.findByText('hello retry')).toBeDefined();
    expect(load).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
