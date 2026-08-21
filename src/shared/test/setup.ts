import { afterEach } from 'vitest';

// jsdom-only cleanup: component tests opt into the jsdom environment, node
// suites keep running without a DOM.
afterEach(async () => {
  if (typeof document === 'undefined') {
    return;
  }
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});

export {};
