// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BranchChooserDialog } from './BranchChooserDialog';
import type { BranchChooserCard } from '../model/types';

function createCard(id: string, name: string, overrides: Partial<BranchChooserCard> = {}) {
  const card: BranchChooserCard = {
    id,
    name,
    description: `${name} description`,
    glyph: name.charAt(0),
    price: { label: '$40', accessibleLabel: '40 gold' },
    isDisabled: false,
    grades: {
      ariaLabel: `${name} grades`,
      gradeColumnLabel: 'Lv',
      statColumns: [
        { label: 'DMG', title: 'Damage' },
        { label: 'RNG', title: 'Range' },
      ],
      specialColumnLabel: 'Special',
      rows: [
        { grade: 4, stats: ['+10%', '+0'], special: '—' },
        { grade: 5, stats: ['+20%', '+1'], special: 'Slow' },
      ],
    },
    ...overrides,
  };
  return card;
}

const CARDS: readonly BranchChooserCard[] = [
  createCard('fire', 'Fire'),
  createCard('frost', 'Frost'),
];

describe('BranchChooserDialog (shared shell)', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    cleanup();
    consoleError.mockClear();
  });

  function renderDialog(cards: readonly BranchChooserCard[] = CARDS) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <BranchChooserDialog
        title="Develop Arrow Tower"
        cards={cards}
        lockWarning="The other branch locks for the match."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel, dialog: screen.getByRole('dialog') };
  }

  it('portals a labelled modal with both cards, their grade tables and the lock warning', () => {
    const { dialog } = renderDialog();

    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Develop Arrow Tower' })).toBe(dialog);
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('The other branch locks for the match.').id,
    );
    expect(document.activeElement).toBe(dialog);

    const fireTable = screen.getByRole('table', { name: 'Fire grades' });
    expect(
      within(fireTable)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Lv', 'DMG', 'RNG', 'Special']);
    expect(within(fireTable).getByRole('rowheader', { name: '5' })).toBeTruthy();
    expect(within(fireTable).getByText('Slow')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Frost grades' })).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('commits only after Choose then Confirm', () => {
    const { onConfirm } = renderDialog();
    const confirm = screen.getByRole('button', { name: 'Confirm branch' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(confirm.textContent).toContain('$40');

    const chooseFrost = screen.getByRole('button', { name: 'Choose Frost for 40 gold' });
    fireEvent.click(chooseFrost);
    expect(chooseFrost.getAttribute('aria-pressed')).toBe('true');
    expect(chooseFrost.textContent).toContain('Selected');
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Choose Fire for 40 gold' }));
    expect(chooseFrost.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Fire for 40 gold' }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('fire');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('cancels on Escape and on Cancel, and keeps Tab inside the dialog', () => {
    const { dialog, onCancel, onConfirm } = renderDialog();
    const buttons = within(dialog).getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (!first || !last) {
      throw new Error('dialog has no buttons');
    }

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables Choose with its reason when a card cannot be paid for', () => {
    renderDialog(
      CARDS.map((card) => ({ ...card, isDisabled: true, disabledReason: 'Not enough gold' })),
    );

    const choose = screen.getByRole('button', {
      name: 'Choose Fire for 40 gold',
    }) as HTMLButtonElement;
    expect(choose.disabled).toBe(true);
    expect(choose.title).toBe('Not enough gold');
    expect(
      (screen.getByRole('button', { name: 'Confirm branch' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
