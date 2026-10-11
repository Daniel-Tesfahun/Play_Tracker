import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import {
  EMPTY_SELECTION,
  pruneSelection,
  selectedItems,
  startSelecting,
  stopSelecting,
  toggleAll,
  toggleSelected,
  type Selection,
} from '@/lib/selection';

/**
 * Bulk-select mode for a list. Android back leaves select mode instead of the screen,
 * and ids that disappear from the list are dropped automatically.
 */
export function useSelection<T extends { id: number }>(items: readonly T[]) {
  const [raw, setSelection] = useState<Selection>(EMPTY_SELECTION);
  // Derived, not synced in an effect: deleted items simply stop counting as selected.
  const selection = pruneSelection(
    raw,
    items.map((i) => i.id),
  );

  useEffect(() => {
    if (!selection.active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelection(stopSelecting());
      return true;
    });
    return () => sub.remove();
  }, [selection.active]);

  return {
    active: selection.active,
    count: selection.ids.size,
    isSelected: (id: number) => selection.ids.has(id),
    selected: selectedItems(selection, items),
    allSelected: items.length > 0 && items.every((i) => selection.ids.has(i.id)),
    /** Enter select mode, optionally with one item already selected (press-and-hold). */
    start: (firstId?: number) => setSelection((s) => startSelecting(s, firstId)),
    stop: () => setSelection(stopSelecting()),
    toggle: (id: number) => setSelection((s) => toggleSelected(s, id)),
    toggleAll: () =>
      setSelection((s) =>
        toggleAll(
          s,
          items.map((i) => i.id),
        ),
      ),
  };
}
