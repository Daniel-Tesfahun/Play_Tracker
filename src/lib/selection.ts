/** Multi-select state for bulk actions; immutable so React sees every change. */
export interface Selection {
  active: boolean;
  ids: ReadonlySet<number>;
}

export const EMPTY_SELECTION: Selection = { active: false, ids: new Set() };

export function startSelecting(_: Selection, firstId?: number): Selection {
  return { active: true, ids: firstId === undefined ? new Set() : new Set([firstId]) };
}

export function stopSelecting(): Selection {
  return EMPTY_SELECTION;
}

export function toggleSelected(sel: Selection, id: number): Selection {
  const ids = new Set(sel.ids);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return { active: true, ids };
}

/** Selects everything, or clears if everything is already selected. */
export function toggleAll(sel: Selection, allIds: readonly number[]): Selection {
  const everything = allIds.length > 0 && allIds.every((id) => sel.ids.has(id));
  return { active: true, ids: everything ? new Set() : new Set(allIds) };
}

/** Drops ids that no longer exist (e.g. deleted elsewhere). Returns the same object if nothing changed. */
export function pruneSelection(sel: Selection, existingIds: readonly number[]): Selection {
  const existing = new Set(existingIds);
  const kept = [...sel.ids].filter((id) => existing.has(id));
  return kept.length === sel.ids.size ? sel : { active: sel.active, ids: new Set(kept) };
}

/** The selected items in list order. */
export function selectedItems<T extends { id: number }>(sel: Selection, items: readonly T[]): T[] {
  return items.filter((item) => sel.ids.has(item.id));
}
