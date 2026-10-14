import { createElement, use, type ComponentType, type JSX } from 'react';

export type RetryableLazy<TProps extends object> = {
  /** Suspends while the chunk loads; throws to the Error Boundary if it fails. */
  Component: ComponentType<TProps>;
  /**
   * Forgets a failed load so the next render starts a fresh `import()`. Call
   * it from the Error Boundary's recover action. A load that is pending or
   * succeeded is kept.
   */
  resetFailedLoad: () => void;
};

/**
 * A code-split component, like `React.lazy`, whose failure is not permanent.
 * `React.lazy` caches a rejected import for the page's lifetime, so after a
 * flaky network the screen stays broken until a full reload. Here the failure
 * stays cached (so React does not re-render into a retry loop) only until
 * `resetFailedLoad` is called.
 */
export function createRetryableLazy<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
): RetryableLazy<TProps> {
  let pending: Promise<ComponentType<TProps>> | null = null;
  let hasFailed = false;

  const loadOnce = (): Promise<ComponentType<TProps>> => {
    if (pending) {
      return pending;
    }
    const attempt = load();
    pending = attempt;
    hasFailed = false;
    attempt.catch(() => {
      if (pending === attempt) {
        hasFailed = true;
      }
    });
    return attempt;
  };

  function RetryableLazyComponent(props: TProps): JSX.Element {
    // The loaded component is resolved once and kept for the module's
    // lifetime, so its identity is stable across renders.
    return createElement(use(loadOnce()), props);
  }

  return {
    Component: RetryableLazyComponent,
    resetFailedLoad: () => {
      if (hasFailed) {
        pending = null;
        hasFailed = false;
      }
    },
  };
}
