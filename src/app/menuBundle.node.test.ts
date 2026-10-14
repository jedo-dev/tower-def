import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Walks the static (eagerly bundled) import graph from the app entry. Dynamic
// `import()` calls are code-split points and are deliberately not followed,
// so everything reached here ships in the initial bundle the menus load.

const SOURCE_ROOT = resolve(import.meta.dirname, '..');
const ENTRY_FILE = resolve(SOURCE_ROOT, 'main.tsx');
const RESOLVABLE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

// `import x from 'y'`, `import { a, type b } from 'y'`, `export { a } from 'y'`
// and bare `import 'y'`; `import type` / `export type` are erased at build.
const STATIC_IMPORT_PATTERN =
  /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;

function resolveSourceFile(fromFile: string, specifier: string): string | null {
  const base = resolve(dirname(fromFile), specifier);
  for (const suffix of RESOLVABLE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function collectStaticGraph(entryFile: string) {
  const sourceFiles = new Set<string>();
  const packages = new Set<string>();
  const queue = [entryFile];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || sourceFiles.has(file)) {
      continue;
    }
    sourceFiles.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(STATIC_IMPORT_PATTERN)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        packages.add(specifier.split('/')[0]);
        continue;
      }
      const resolved = resolveSourceFile(file, specifier);
      if (resolved) {
        queue.push(resolved);
      }
    }
  }
  const relativeFiles = [...sourceFiles].map((file) =>
    relative(SOURCE_ROOT, file).replaceAll('\\', '/'),
  );
  return { relativeFiles, packages };
}

describe('initial (menu) bundle', () => {
  const graph = collectStaticGraph(ENTRY_FILE);

  it('reaches the menu screens', () => {
    expect(graph.relativeFiles).toContain('app/App.tsx');
    expect(graph.relativeFiles).toContain('pages/start-page/index.ts');
    expect(graph.relativeFiles).toContain('pages/game-page/gamePageChunk.ts');
  });

  it('does not pull the Phaser engine in', () => {
    expect(graph.packages.has('phaser')).toBe(false);
    expect(graph.relativeFiles).not.toContain('pages/game-page/GamePage.tsx');
    expect(graph.relativeFiles.filter((file) => file.endsWith('GameCanvas.tsx'))).toEqual([]);
  });
});
