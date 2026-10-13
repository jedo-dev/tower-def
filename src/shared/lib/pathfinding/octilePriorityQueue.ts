import { OCTILE_PRIORITY_KEY_SCALE } from '../../constants/pathfinding';

/**
 * Binary min-heap of grid indices for A* / Dijkstra. Entries are ordered by
 * primary key, then secondary key, then insertion order, so pops are fully
 * deterministic. Keys are snapped to a fixed precision first: sums of sqrt(2)
 * steps pick up rounding noise, and without snapping equal-cost candidates
 * would be ordered by that noise instead of by the secondary key. Duplicate pushes of one index are
 * allowed (lazy decrease-key); callers skip already-closed indices on pop.
 */
export type OctilePriorityQueue = {
  readonly size: number;
  push(index: number, primary: number, secondary: number): void;
  /** Index with the smallest keys; -1 when empty. */
  pop(): number;
};

export function createOctilePriorityQueue(capacity: number): OctilePriorityQueue {
  let entryCapacity = Math.max(1, capacity);
  let nodeByEntry = new Int32Array(entryCapacity);
  let primaryByEntry = new Float64Array(entryCapacity);
  let secondaryByEntry = new Float64Array(entryCapacity);
  let heap = new Int32Array(entryCapacity);
  let heapSize = 0;
  let entryCount = 0;

  function isBefore(left: number, right: number): boolean {
    const primaryDelta = primaryByEntry[left] - primaryByEntry[right];
    if (primaryDelta !== 0) {
      return primaryDelta < 0;
    }
    const secondaryDelta = secondaryByEntry[left] - secondaryByEntry[right];
    if (secondaryDelta !== 0) {
      return secondaryDelta < 0;
    }
    return left < right;
  }

  function grow(): void {
    entryCapacity *= 2;
    const nextNodes = new Int32Array(entryCapacity);
    const nextPrimary = new Float64Array(entryCapacity);
    const nextSecondary = new Float64Array(entryCapacity);
    const nextHeap = new Int32Array(entryCapacity);
    nextNodes.set(nodeByEntry);
    nextPrimary.set(primaryByEntry);
    nextSecondary.set(secondaryByEntry);
    nextHeap.set(heap);
    nodeByEntry = nextNodes;
    primaryByEntry = nextPrimary;
    secondaryByEntry = nextSecondary;
    heap = nextHeap;
  }

  function siftUp(position: number): void {
    const entry = heap[position];
    let current = position;
    while (current > 0) {
      const parent = (current - 1) >> 1;
      if (!isBefore(entry, heap[parent])) {
        break;
      }
      heap[current] = heap[parent];
      current = parent;
    }
    heap[current] = entry;
  }

  function siftDown(position: number): void {
    const entry = heap[position];
    let current = position;
    for (;;) {
      const left = current * 2 + 1;
      if (left >= heapSize) {
        break;
      }
      const right = left + 1;
      const child = right < heapSize && isBefore(heap[right], heap[left]) ? right : left;
      if (!isBefore(heap[child], entry)) {
        break;
      }
      heap[current] = heap[child];
      current = child;
    }
    heap[current] = entry;
  }

  return {
    get size() {
      return heapSize;
    },
    push(index, primary, secondary) {
      if (entryCount >= entryCapacity) {
        grow();
      }
      const entry = entryCount;
      entryCount += 1;
      nodeByEntry[entry] = index;
      primaryByEntry[entry] = Math.round(primary * OCTILE_PRIORITY_KEY_SCALE);
      secondaryByEntry[entry] = Math.round(secondary * OCTILE_PRIORITY_KEY_SCALE);
      heap[heapSize] = entry;
      heapSize += 1;
      siftUp(heapSize - 1);
    },
    pop() {
      if (heapSize === 0) {
        return -1;
      }
      const top = heap[0];
      heapSize -= 1;
      if (heapSize > 0) {
        heap[0] = heap[heapSize];
        siftDown(0);
      }
      return nodeByEntry[top];
    },
  };
}
