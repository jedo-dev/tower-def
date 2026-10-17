// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BranchChooserDialog } from './BranchChooserDialog';
import { UNCHANGED_GRADE_VALUE, type BranchChooserCard } from '../model/types';
import type { BranchChooserDialogProps } from '../model/types';

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
      gradeColumnLabel: 'Grade',
      statColumns: [
        { label: 'DMG', title: 'Damage' },
        { label: 'RNG', title: 'Range' },
      ],
      specialColumnLabel: 'Special',
      rows: [
        { grade: 4, stats: ['+10%', UNCHANGED_GRADE_VALUE], special: UNCHANGED_GRADE_VALUE },
        { grade: 5, stats: ['+20%', UNCHANGED_GRADE_VALUE], special: 'Slow' },
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

  function renderDialog(
    cards: readonly BranchChooserCard[] = CARDS,
    extra: Partial<BranchChooserDialogProps> = {},
  ) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <BranchChooserDialog
        title="Develop Arrow Tower"
        cards={cards}
        lockWarning="The other branch locks for the match."
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...extra}
      />,
    );
    return { onConfirm, onCancel, dialog: screen.getByRole('dialog') };
  }

  it('portals a labelled modal with both cards, sideways grade tables and the lock warning', () => {
    const { dialog } = renderDialog();

    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Develop Arrow Tower' })).toBe(dialog);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Develop · Arrow Tower');
    expect(within(dialog).getByText('The other branch locks for the match.').id).toBe(
      dialog.getAttribute('aria-describedby'),
    );
    expect(within(dialog).getByText('Step 1 of 2 · Choose')).toBeTruthy();
    expect(document.activeElement).toBe(dialog);

    const fireTable = screen.getByRole('table', { name: 'Fire grades' });
    expect(
      within(fireTable)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Grade', '4', '5']);
    // RNG never changes, so only DMG gets a row.
    expect(
      within(fireTable)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['DMG']);
    const fireCard = screen.getByRole('article', { name: 'Fire' });
    expect(within(fireCard).getByRole('list', { name: 'Special' }).textContent).toBe('5 Slow');
    expect(within(fireCard).getByText('$40')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Frost grades' })).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the countdown chip only when one is given', () => {
    renderDialog(CARDS, {
      countdown: { label: '0:21', accessibleLabel: 'Build phase ends in 21 seconds' },
    });

    const timer = screen.getByRole('timer', { name: 'Build phase ends in 21 seconds' });
    expect(timer.textContent).toBe('0:21');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('commits only after Choose then Confirm, and Back returns to step 1', () => {
    const { onConfirm, onCancel } = renderDialog();
    const confirm = screen.getByRole('button', { name: 'Confirm branch' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(confirm.textContent).toBe('Choose a branch first');

    const chooseFrost = screen.getByRole('button', { name: 'Choose Frost for 40 gold' });
    fireEvent.click(chooseFrost);
    expect(chooseFrost.getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('article', { name: 'Frost' })).getByText('Chosen')).toBeTruthy();
    expect(screen.getByText('Step 2 of 2 · Confirm')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm Frost for 40 gold' }).textContent).toBe(
      'Confirm Frost · $40',
    );
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(chooseFrost.getAttribute('aria-pressed')).toBe('false');
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Choose Fire for 40 gold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Fire for 40 gold' }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('fire');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('confirms with Enter outside a button once a branch is chosen', () => {
    const { dialog, onConfirm } = renderDialog();

    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Choose Frost for 40 gold' }));
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('frost');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('cancels on Escape, Close and Cancel, and keeps Tab inside the dialog', () => {
    const { dialog, onCancel, onConfirm } = renderDialog();
    const close = screen.getByRole('button', { name: 'Close' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.click(close);
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps Confirm disabled with a visible reason when the chosen card cannot be paid for', () => {
    const { dialog, onConfirm } = renderDialog(
      CARDS.map((card) => ({ ...card, isDisabled: true, disabledReason: 'Not enough gold' })),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose Fire for 40 gold' }));
    const confirm = screen.getByRole('button', {
      name: 'Confirm Fire for 40 gold',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const reason = screen.getByText('Not enough gold');
    expect(confirm.getAttribute('aria-describedby')).toBe(reason.id);

    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
