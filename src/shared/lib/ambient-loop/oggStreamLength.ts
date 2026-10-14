// Reads how many PCM frames an Ogg Vorbis file declares. The granule position
// of the last page is the exact sample count the decoder must stop at, so it
// is the authoritative length no matter how much block padding the encoder
// wrote after it.

const OGG_PAGE_MAGIC = 'OggS';
const PAGE_HEADER_BYTES = 27;
const GRANULE_OFFSET = 6;
const SEGMENT_COUNT_OFFSET = 26;
const END_OF_STREAM_FLAG = 0x04;

export type OggStreamLength = {
  /** Granule position of the last page: total frames in the stream. */
  frames: number;
  /** Whether the last page carries the end-of-stream flag. */
  isComplete: boolean;
};

export function readOggStreamLength(bytes: Uint8Array): OggStreamLength {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  let lastGranule: bigint | null = null;
  let isComplete = false;

  while (offset + PAGE_HEADER_BYTES <= bytes.length) {
    if (String.fromCharCode(...bytes.subarray(offset, offset + 4)) !== OGG_PAGE_MAGIC) {
      throw new Error(`not an Ogg page at byte ${offset}`);
    }
    const segmentCount = bytes[offset + SEGMENT_COUNT_OFFSET];
    let pageBodyBytes = 0;
    for (let segment = 0; segment < segmentCount; segment += 1) {
      pageBodyBytes += bytes[offset + PAGE_HEADER_BYTES + segment];
    }
    lastGranule = view.getBigInt64(offset + GRANULE_OFFSET, true);
    isComplete = (bytes[offset + 5] & END_OF_STREAM_FLAG) !== 0;
    offset += PAGE_HEADER_BYTES + segmentCount + pageBodyBytes;
  }

  if (lastGranule === null) {
    throw new Error('no Ogg pages found');
  }
  return { frames: Number(lastGranule), isComplete };
}
