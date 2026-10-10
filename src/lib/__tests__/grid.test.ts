import { toGridRows } from '../grid';

describe('toGridRows', () => {
  it('appends an add tile and pads the last row with spacers', () => {
    const rows = toGridRows([1, 2, 3], 2);
    expect(rows.map((r) => r.map((c) => c.kind))).toEqual([
      ['item', 'item'],
      ['item', 'add'],
    ]);

    const padded = toGridRows([1, 2], 2);
    expect(padded.map((r) => r.map((c) => c.kind))).toEqual([
      ['item', 'item'],
      ['add', 'spacer'],
    ]);
  });

  it('handles an empty grid and many sections', () => {
    expect(toGridRows([], 3)).toHaveLength(1);
    const rows = toGridRows(Array.from({ length: 14 }, (_, i) => i), 3);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.length === 3)).toBe(true);
  });
});
