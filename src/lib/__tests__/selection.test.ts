import {
  EMPTY_SELECTION,
  pruneSelection,
  selectedItems,
  startSelecting,
  stopSelecting,
  toggleAll,
  toggleSelected,
} from '../selection';

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe('selection', () => {
  it('starts empty and inactive', () => {
    expect(EMPTY_SELECTION.active).toBe(false);
    expect(EMPTY_SELECTION.ids.size).toBe(0);
  });

  it('starts selecting, optionally with a first item', () => {
    expect(startSelecting(EMPTY_SELECTION)).toMatchObject({ active: true });
    expect([...startSelecting(EMPTY_SELECTION, 2).ids]).toEqual([2]);
  });

  it('toggles items on and off without mutating', () => {
    const a = startSelecting(EMPTY_SELECTION);
    const b = toggleSelected(a, 1);
    const c = toggleSelected(b, 1);
    expect(a.ids.size).toBe(0);
    expect([...b.ids]).toEqual([1]);
    expect(c.ids.size).toBe(0);
  });

  it('selects all, or clears when everything is already selected', () => {
    const all = toggleAll(startSelecting(EMPTY_SELECTION), [1, 2, 3]);
    expect([...all.ids].sort()).toEqual([1, 2, 3]);
    expect(toggleAll(all, [1, 2, 3]).ids.size).toBe(0);
    // Partial selection → select all.
    expect(toggleAll(toggleSelected(all, 2), [1, 2, 3]).ids.size).toBe(3);
  });

  it('drops ids that no longer exist, and keeps the same object otherwise', () => {
    const sel = toggleAll(startSelecting(EMPTY_SELECTION), [1, 2, 3]);
    expect([...pruneSelection(sel, [1, 3]).ids].sort()).toEqual([1, 3]);
    expect(pruneSelection(sel, [1, 2, 3])).toBe(sel);
  });

  it('returns selected items in list order', () => {
    const sel = toggleSelected(toggleSelected(startSelecting(EMPTY_SELECTION), 3), 1);
    expect(selectedItems(sel, items)).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('stopping clears everything', () => {
    expect(stopSelecting()).toBe(EMPTY_SELECTION);
  });
});
