import { describe, expect, it } from 'vitest';
import { readOggStreamLength } from './oggStreamLength';

function createPage(granule: bigint, segments: number[], flags = 0): Uint8Array {
  const body = segments.reduce((sum, size) => sum + size, 0);
  const page = new Uint8Array(27 + segments.length + body);
  page.set([0x4f, 0x67, 0x67, 0x53], 0);
  page[5] = flags;
  new DataView(page.buffer).setBigInt64(6, granule, true);
  page[26] = segments.length;
  page.set(segments, 27);
  return page;
}

function concat(pages: Uint8Array[]): Uint8Array {
  const total = pages.reduce((sum, page) => sum + page.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  pages.forEach((page) => {
    bytes.set(page, offset);
    offset += page.length;
  });
  return bytes;
}

describe('readOggStreamLength', () => {
  it('reports the last page granule and the end-of-stream flag', () => {
    const bytes = concat([
      createPage(0n, [30, 255, 12]),
      createPage(1024n, [255, 255, 7]),
      createPage(2945467n, [100], 0x04),
    ]);

    expect(readOggStreamLength(bytes)).toEqual({ frames: 2945467, isComplete: true });
  });

  it('flags a stream whose last page is not final', () => {
    const bytes = concat([createPage(0n, [1]), createPage(500n, [2])]);

    expect(readOggStreamLength(bytes)).toEqual({ frames: 500, isComplete: false });
  });

  it('rejects bytes that are not Ogg pages', () => {
    expect(() => readOggStreamLength(new Uint8Array(40))).toThrow(/not an Ogg page/);
    expect(() => readOggStreamLength(new Uint8Array(0))).toThrow(/no Ogg pages/);
  });
});
