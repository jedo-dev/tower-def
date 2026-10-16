import { describe, expect, it } from 'vitest';
import {
  CONTENT_LORE_MAX_LENGTH,
  ContentValidationError,
  assertKnownKeys,
  readBoundedInteger,
  readNumber,
  readOptionalBoundedString,
  readOptionalString,
  readRecord,
  readStringFrom,
} from './contentValidation';

const FILE = 'content/units/undead.json';

describe('content validation primitives', () => {
  it('names the file and the entity in the error message', () => {
    const error = new ContentValidationError({ file: FILE, entityId: 'undead_ghoul' }, 'boom');

    expect(error.name).toBe('ContentValidationError');
    expect(error.message).toBe(`${FILE} [undead_ghoul]: boom`);
  });

  it('falls back to the file alone when no entity is known', () => {
    expect(new ContentValidationError({ file: FILE }, 'boom').message).toBe(`${FILE}: boom`);
  });

  it('rejects arrays and null where an object is expected', () => {
    expect(() => readRecord([], { file: FILE })).toThrow(ContentValidationError);
    expect(() => readRecord(null, { file: FILE })).toThrow(ContentValidationError);
    expect(readRecord({ a: 1 }, { file: FILE })).toEqual({ a: 1 });
  });

  it('treats an omitted optional string as undefined but validates a present one', () => {
    expect(readOptionalString({}, 'description', { file: FILE })).toBeUndefined();
    expect(() => readOptionalString({ description: 4 }, 'description', { file: FILE })).toThrow(
      ContentValidationError,
    );
  });

  it('rejects NaN and Infinity as stat values', () => {
    expect(() => readNumber({ speed: Number.NaN }, 'speed', { file: FILE })).toThrow(
      ContentValidationError,
    );
    expect(() => readNumber({ speed: Number.POSITIVE_INFINITY }, 'speed', { file: FILE })).toThrow(
      ContentValidationError,
    );
  });

  it('reads a whole number within its bounds and names a fraction or overflow', () => {
    const bound = { min: -25, max: 75 };
    const location = { file: FILE, entityId: 'undead_ghoul' };

    expect(readBoundedInteger({ physicalArmor: -3 }, 'physicalArmor', location, bound)).toBe(-3);
    expect(() =>
      readBoundedInteger({ physicalArmor: 1.5 }, 'physicalArmor', location, bound),
    ).toThrow(`${FILE} [undead_ghoul]: "physicalArmor" must be a whole number, got 1.5`);
    expect(() =>
      readBoundedInteger({ physicalArmor: 76 }, 'physicalArmor', location, bound),
    ).toThrow(`${FILE} [undead_ghoul]: "physicalArmor" must be between -25 and 75, got 76`);
  });

  it('narrows a string to the allowed set', () => {
    const allowed = ['ground', 'air'] as const;

    expect(readStringFrom({ moveType: 'air' }, 'moveType', { file: FILE }, allowed)).toBe('air');
    expect(() =>
      readStringFrom({ moveType: 'water' }, 'moveType', { file: FILE }, allowed),
    ).toThrow(`${FILE}: "moveType" is not a known value: water`);
  });

  it('accepts only declared keys', () => {
    expect(() => assertKnownKeys({ id: 'x' }, ['id'], { file: FILE })).not.toThrow();
    expect(() => assertKnownKeys({ id: 'x', hp: 1 }, ['id'], { file: FILE })).toThrow(
      `${FILE}: unknown field "hp"`,
    );
  });

  it('bounds optional text by length and names the overflow', () => {
    const location = { file: FILE, entityId: 'undead_ghoul' };

    expect(readOptionalBoundedString({}, 'lore', location, 10)).toBeUndefined();
    expect(readOptionalBoundedString({ lore: 'short' }, 'lore', location, 10)).toBe('short');
    expect(() => readOptionalBoundedString({ lore: 'eleven chars' }, 'lore', location, 10)).toThrow(
      `${FILE} [undead_ghoul]: "lore" must be at most 10 characters, got 12`,
    );
    expect(CONTENT_LORE_MAX_LENGTH).toBe(160);
  });
});
