export type GridCell<T> = { kind: 'item'; item: T } | { kind: 'add' } | { kind: 'spacer'; key: string };

/**
 * Lays items out row by row (optionally with a trailing "add" tile), padding the
 * last row with spacers so every card in the grid stays the same width.
 */
export function toGridRows<T>(items: readonly T[], columns: number, withAdd = true): GridCell<T>[][] {
  const cells: GridCell<T>[] = items.map((item) => ({ kind: 'item' as const, item }));
  if (withAdd) cells.push({ kind: 'add' });
  const rows: GridCell<T>[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const row = cells.slice(i, i + columns);
    while (row.length < columns) row.push({ kind: 'spacer', key: `spacer-${i}-${row.length}` });
    rows.push(row);
  }
  return rows;
}
