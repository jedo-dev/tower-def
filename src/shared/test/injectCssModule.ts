/**
 * jsdom does not load the stylesheets a component imports, so layout
 * contracts (max-height, overflow) are invisible to `getComputedStyle`.
 * This takes a CSS module's source (import it with Vite's `?raw` suffix),
 * rewrites its local class selectors to the hashed names vitest handed the
 * component, and appends the result as a `<style>` element. Call `remove()`
 * from the returned handle in cleanup.
 */
export function injectCssModule(
  cssSource: string,
  classNames: Record<string, string>,
): { remove: () => void } {
  // vitest hands components a Proxy for the class map, so look the name up
  // instead of testing `in`.
  // The lookahead keeps file extensions inside url('...') untouched.
  const classSelectorPattern = /\.([A-Za-z_][\w-]*)(?=[^\w'")]|$)/g;
  const rewritten = cssSource.replace(classSelectorPattern, (match, name: string) => {
    const hashedName = classNames[name];
    return typeof hashedName === 'string' && hashedName.length > 0 ? `.${hashedName}` : match;
  });
  const styleElement = document.createElement('style');
  styleElement.textContent = rewritten;
  document.head.appendChild(styleElement);
  return { remove: () => styleElement.remove() };
}
