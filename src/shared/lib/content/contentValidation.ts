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

/**
 * Longest `lore` text a creature or tower may carry. Lore is read on a phone
 * screen next to a portrait, so it stays at one or two sentences.
 */
export const CONTENT_LORE_MAX_LENGTH = 160;

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

/** Optional text with an upper length bound, e.g. bestiary lore. */
export function readOptionalBoundedString(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
  maxLength: number,
): string | undefined {
  const value = readOptionalString(source, key, location);

  if (value !== undefined && value.length > maxLength) {
    throw new ContentValidationError(
      location,
      `"${key}" must be at most ${maxLength} characters, got ${value.length}`,
    );
  }

  return value;
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

/** A whole number within `bound`, e.g. an armor value. */
export function readBoundedInteger(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
  bound: NumericBound,
): number {
  const value = readNumber(source, key, location, bound);

  if (!Number.isInteger(value)) {
    throw new ContentValidationError(location, `"${key}" must be a whole number, got ${value}`);
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

/**
 * Id of the first entity listed under `listKey`, so a stale file can name a
 * concrete entity to migrate. Undefined when the list is missing or malformed.
 */
export function findFirstEntityId(
  file: Record<string, unknown>,
  listKey: string,
): string | undefined {
  const list = file[listKey];

  if (!Array.isArray(list)) {
    return undefined;
  }

  const [first] = list as unknown[];

  if (typeof first !== 'object' || first === null) {
    return undefined;
  }

  const id = (first as Record<string, unknown>).id;

  return typeof id === 'string' && id.trim() !== '' ? id : undefined;
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
