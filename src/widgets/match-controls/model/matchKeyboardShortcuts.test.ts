import { describe, expect, it } from 'vitest';
import {
  resolveMatchShortcut,
  type MatchShortcutFocusTarget,
  type MatchShortcutKeyEvent,
} from './matchKeyboardShortcuts';

function key(overrides: Partial<MatchShortcutKeyEvent>): MatchShortcutKeyEvent {
  return {
    key: '',
    code: '',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
    ...overrides,
  };
}

const BODY: MatchShortcutFocusTarget = { tagName: 'BODY', isContentEditable: false };
const INPUT: MatchShortcutFocusTarget = { tagName: 'INPUT', isContentEditable: false };
const BUTTON: MatchShortcutFocusTarget = { tagName: 'BUTTON', isContentEditable: false };

describe('resolveMatchShortcut', () => {
  it('maps Space and P to the pause toggle', () => {
    expect(resolveMatchShortcut(key({ code: 'Space', key: ' ' }), BODY)).toEqual({
      kind: 'toggle-pause',
    });
    expect(resolveMatchShortcut(key({ key: 'p', code: 'KeyP' }), BODY)).toEqual({
      kind: 'toggle-pause',
    });
    expect(resolveMatchShortcut(key({ key: 'P', code: 'KeyP' }), null)).toEqual({
      kind: 'toggle-pause',
    });
  });

  it('maps 1 and 2 to the speeds and Escape to the quit prompt', () => {
    expect(resolveMatchShortcut(key({ key: '1', code: 'Digit1' }), BODY)).toEqual({
      kind: 'set-speed',
      speed: 1,
    });
    expect(resolveMatchShortcut(key({ key: '2', code: 'Digit2' }), BODY)).toEqual({
      kind: 'set-speed',
      speed: 2,
    });
    expect(resolveMatchShortcut(key({ key: 'Escape', code: 'Escape' }), BODY)).toEqual({
      kind: 'request-quit',
    });
  });

  it('maps +/= and - to the board zoom steps and 0 to the reset', () => {
    expect(resolveMatchShortcut(key({ key: '+', code: 'Equal' }), BODY)).toEqual({
      kind: 'zoom-board',
      action: 'in',
    });
    expect(resolveMatchShortcut(key({ key: '=', code: 'Equal' }), BODY)).toEqual({
      kind: 'zoom-board',
      action: 'in',
    });
    expect(resolveMatchShortcut(key({ key: '-', code: 'Minus' }), BODY)).toEqual({
      kind: 'zoom-board',
      action: 'out',
    });
    expect(resolveMatchShortcut(key({ key: '0', code: 'Digit0' }), BODY)).toEqual({
      kind: 'zoom-board',
      action: 'reset',
    });
    // Browser page zoom keeps its chords.
    expect(resolveMatchShortcut(key({ key: '+', code: 'Equal', ctrlKey: true }), BODY)).toBeNull();
    expect(resolveMatchShortcut(key({ key: '0', code: 'Digit0' }), INPUT)).toBeNull();
  });

  it('stays out of text entry and modifier chords', () => {
    expect(resolveMatchShortcut(key({ key: 'p', code: 'KeyP' }), INPUT)).toBeNull();
    expect(
      resolveMatchShortcut(key({ key: '2', code: 'Digit2' }), {
        tagName: 'DIV',
        isContentEditable: true,
      }),
    ).toBeNull();
    expect(resolveMatchShortcut(key({ key: 'p', code: 'KeyP', ctrlKey: true }), BODY)).toBeNull();
    expect(resolveMatchShortcut(key({ key: 'p', code: 'KeyP', repeat: true }), BODY)).toBeNull();
  });

  it('leaves Space to a focused button but still takes P there', () => {
    expect(resolveMatchShortcut(key({ code: 'Space', key: ' ' }), BUTTON)).toBeNull();
    expect(resolveMatchShortcut(key({ key: 'p', code: 'KeyP' }), BUTTON)).toEqual({
      kind: 'toggle-pause',
    });
  });

  it('ignores unrelated keys', () => {
    expect(resolveMatchShortcut(key({ key: 'x', code: 'KeyX' }), BODY)).toBeNull();
  });
});
