import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Feature-Sliced Design layer guard (Decision 012 in docs/04-decisions.md).
// Every relative import under `src/` must point at the same layer or a lower
// one. Type-only imports count too: a type dependency still couples the layers.
// Slice isolation inside one layer is not checked here.

const SOURCE_ROOT = resolve(import.meta.dirname, '..');

/** Lower rank may never import higher rank. `content` is authored data below `shared`. */
const LAYER_RANK: Readonly<Record<string, number>> = {
  content: 0,
  assets: 0,
  shared: 1,
  entities: 2,
  features: 3,
  widgets: 4,
  pages: 5,
  app: 6,
};

/** Files directly under `src/` (the entrypoint) belong to the app layer. */
const ROOT_FILE_LAYER = 'app';

const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;

// `import x from 'y'`, `import type { a } from 'y'`, `export { a } from 'y'`,
// `export type { a } from 'y'`, bare `import 'y'`, `import('y')` and
// `vi.mock('y')`. Only relative specifiers are layer-checked.
const IMPORT_SPECIFIER_PATTERN =
  /(?:^\s*(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?|\bimport\s*\(\s*|\bvi\.mock\(\s*)['"](\.\.?\/[^'"]+)['"]/gm;

type LayerViolation = {
  file: string;
  specifier: string;
  fromLayer: string;
  toLayer: string;
};

function listSourceFiles(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      listSourceFiles(fullPath, out);
    } else if (SOURCE_FILE_PATTERN.test(entry)) {
      out.push(fullPath);
    }
  }
  return out;
}

function toSourceRelative(absolutePath: string): string {
  return relative(SOURCE_ROOT, absolutePath).replaceAll('\\', '/');
}

/** The FSD layer of a path relative to `src/`, or null for paths outside `src/`. */
export function resolveLayer(sourceRelativePath: string): string | null {
  if (sourceRelativePath.startsWith('../')) {
    return null;
  }
  const [firstSegment] = sourceRelativePath.split('/');
  if (!sourceRelativePath.includes('/')) {
    return ROOT_FILE_LAYER;
  }
  return firstSegment in LAYER_RANK ? firstSegment : null;
}

/** True when a file in `fromLayer` may import a file in `toLayer`. */
export function isImportAllowed(fromLayer: string, toLayer: string): boolean {
  return LAYER_RANK[toLayer] <= LAYER_RANK[fromLayer];
}

function collectLayerViolations(files: readonly string[]): {
  violations: LayerViolation[];
  unknownLayers: string[];
} {
  const violations: LayerViolation[] = [];
  const unknownLayers: string[] = [];
  for (const file of files) {
    const fileRelative = toSourceRelative(file);
    const fromLayer = resolveLayer(fileRelative);
    if (fromLayer === null) {
      unknownLayers.push(fileRelative);
      continue;
    }
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
      const specifier = match[1];
      const targetRelative = toSourceRelative(resolve(dirname(file), specifier));
      const toLayer = resolveLayer(targetRelative);
      if (toLayer === null) {
        unknownLayers.push(`${fileRelative} -> ${specifier}`);
        continue;
      }
      if (!isImportAllowed(fromLayer, toLayer)) {
        violations.push({ file: fileRelative, specifier, fromLayer, toLayer });
      }
    }
  }
  return { violations, unknownLayers };
}

function formatViolation(violation: LayerViolation): string {
  return `${violation.file} (${violation.fromLayer}) -> ${violation.specifier} (${violation.toLayer})`;
}

describe('FSD layer import rules', () => {
  const sourceFiles = listSourceFiles(SOURCE_ROOT);
  const { violations, unknownLayers } = collectLayerViolations(sourceFiles);

  it('scans the whole source tree', () => {
    expect(sourceFiles.length).toBeGreaterThan(100);
  });

  it('knows the layer of every file and every relative import', () => {
    expect(unknownLayers).toEqual([]);
  });

  it('never imports a higher layer (shared < entities < features < widgets < pages < app)', () => {
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('keeps shared free of the game engine', () => {
    const sharedEngineImports = violations.filter(
      (violation) =>
        violation.fromLayer === 'shared' && violation.specifier.includes('game-engine'),
    );
    expect(sharedEngineImports).toEqual([]);
  });
});

describe('layer helpers', () => {
  it('ranks the layers bottom-up', () => {
    expect(isImportAllowed('widgets', 'entities')).toBe(true);
    expect(isImportAllowed('shared', 'shared')).toBe(true);
    expect(isImportAllowed('entities', 'features')).toBe(false);
    expect(isImportAllowed('shared', 'features')).toBe(false);
  });

  it('maps paths to layers', () => {
    expect(resolveLayer('shared/lib/grid/index')).toBe('shared');
    expect(resolveLayer('features/game-engine/scenes/GameScene')).toBe('features');
    expect(resolveLayer('main.tsx')).toBe('app');
    expect(resolveLayer('content/towers/archetypes.json')).toBe('content');
    expect(resolveLayer('../tools/sim-duel')).toBeNull();
    expect(resolveLayer('unknown-layer/file')).toBeNull();
  });
});
