import { describe, expect, it } from 'vitest';
import {
  ContentValidationError,
  assertKnownKeys,
  readNumber,
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
    expect(() => readOptionalString({ description: 4 }, 'description', { file: FILE }))
      .toThrow(ContentValidationError);
  });

  it('rejects NaN and Infinity as stat values', () => {
    expect(() => readNumber({ speed: Number.NaN }, 'speed', { file: FILE })).toThrow(ContentValidationError);
    expect(() => readNumber({ speed: Number.POSITIVE_INFINITY }, 'speed', { file: FILE }))
      .toThrow(ContentValidationError);
  });

  it('narrows a string to the allowed set', () => {
    const allowed = ['ground', 'air'] as const;

    expect(readStringFrom({ moveType: 'air' }, 'moveType', { file: FILE }, allowed)).toBe('air');
    expect(() => readStringFrom({ moveType: 'water' }, 'moveType', { file: FILE }, allowed))
      .toThrow(`${FILE}: "moveType" is not a known value: water`);
  });

  it('accepts only declared keys', () => {
    expect(() => assertKnownKeys({ id: 'x' }, ['id'], { file: FILE })).not.toThrow();
    expect(() => assertKnownKeys({ id: 'x', hp: 1 }, ['id'], { file: FILE }))
      .toThrow(`${FILE}: unknown field "hp"`);
  });
});
