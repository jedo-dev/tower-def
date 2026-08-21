/**
 * Primitive validators for authored content files (creatures today, towers
 * next). Authored JSON is untrusted input: every read narrows `unknown` to a
 * concrete type or throws with the file and entity that caused it, so a typo
 * fails at load time instead of producing a silently broken wave.
 */

export type ContentLocation = {
  /** Authored file the value came from, e.g. `content/units/undead.json`. */
  file: string;
  /** Entity inside the file, e.g. `undead_ghoul`. Omitted for file-level reads. */
  entityId?: string;
};

export type NumericBound = {
  min: number;
  max: number;
};

function describeLocation(location: ContentLocation): string {
  return location.entityId ? `${location.file} [${location.entityId}]` : location.file;
}

export class ContentValidationError extends Error {
  constructor(location: ContentLocation, message: string) {
    super(`${describeLocation(location)}: ${message}`);
    this.name = 'ContentValidationError';
  }
}

export function readRecord(value: unknown, location: ContentLocation): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentValidationError(location, 'expected an object');
  }

  return value as Record<string, unknown>;
}

export function readArray(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
): unknown[] {
  const value = source[key];

  if (!Array.isArray(value)) {
    throw new ContentValidationError(location, `"${key}" must be an array`);
  }

  return value;
}

export function readString(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
): string {
  const value = source[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new ContentValidationError(location, `"${key}" must be a non-empty string`);
  }

  return value;
}

export function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
): string | undefined {
  if (source[key] === undefined) {
    return undefined;
  }

  return readString(source, key, location);
}

export function readNumber(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
  bound?: NumericBound,
): number {
  const value = source[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ContentValidationError(location, `"${key}" must be a finite number`);
  }

  if (bound && (value < bound.min || value > bound.max)) {
    throw new ContentValidationError(
      location,
      `"${key}" must be between ${bound.min} and ${bound.max}, got ${value}`,
    );
  }

  return value;
}

export function readIntegerFrom<TValue extends number>(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
  allowedValues: readonly TValue[],
): TValue {
  const value = readNumber(source, key, location);
  const match = allowedValues.find((allowed) => allowed === value);

  if (match === undefined) {
    throw new ContentValidationError(
      location,
      `"${key}" must be one of ${allowedValues.join(', ')}, got ${value}`,
    );
  }

  return match;
}

export function readStringFrom<TValue extends string>(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
  allowedValues: readonly TValue[],
): TValue {
  const value = readString(source, key, location);
  const match = allowedValues.find((allowed) => allowed === value);

  if (match === undefined) {
    throw new ContentValidationError(location, `"${key}" is not a known value: ${value}`);
  }

  return match;
}

export function assertKnownKeys(
  source: Record<string, unknown>,
  allowedKeys: readonly string[],
  location: ContentLocation,
): void {
  const unknownKey = Object.keys(source).find((key) => !allowedKeys.includes(key));

  if (unknownKey !== undefined) {
    throw new ContentValidationError(location, `unknown field "${unknownKey}"`);
  }
}

export function assertSchemaVersion(
  source: Record<string, unknown>,
  expectedVersion: number,
  location: ContentLocation,
): void {
  const version = readNumber(source, 'schemaVersion', location);

  if (version !== expectedVersion) {
    throw new ContentValidationError(
      location,
      `unsupported schemaVersion ${version}, expected ${expectedVersion}`,
    );
  }
}
