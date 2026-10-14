import { describe, expect, it, vi } from 'vitest';
import {
  countFieldRemainingCreeps,
  createOpponentFieldCreepsPublisher,
} from './opponentFieldCreepsPublisher';

function createCreep(status: 'alive' | 'dead' | 'escaped') {
  return { entity: { status } };
}

describe('countFieldRemainingCreeps', () => {
  it('counts alive creeps plus those still waiting to spawn', () => {
    expect(countFieldRemainingCreeps([createCreep('alive'), createCreep('alive')], 3)).toBe(5);
  });

  it('ignores dying and leaked creeps that are still fading out', () => {
    const creeps = [createCreep('dead'), createCreep('escaped'), createCreep('alive')];

    expect(countFieldRemainingCreeps(creeps, 0)).toBe(1);
  });
});

describe('createOpponentFieldCreepsPublisher', () => {
  it('publishes the first value and then only changes', () => {
    const publish = vi.fn();
    const publisher = createOpponentFieldCreepsPublisher(publish);

    publisher.update(0);
    publisher.update(0);
    publisher.update(6);
    publisher.update(6);
    publisher.update(5);

    expect(publish.mock.calls).toEqual([[0], [6], [5]]);
  });
});
