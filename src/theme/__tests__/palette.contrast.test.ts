import { AA_GRAPHIC, AA_TEXT, contrastRatio } from '../contrast';
import { gradients, playerColors, themes, type ColorScheme, type Palette } from '../palette';

/**
 * Every foreground/background pairing the UI actually renders, in both themes.
 * `brand` is a fill only (white text sits on it); violet text uses `brandInk`.
 */
type Pair = [fg: keyof Palette, bg: keyof Palette, min: number];

const SURFACES: (keyof Palette)[] = ['canvas', 'surface', 'elevated'];
const TEXT_ON_SURFACES: (keyof Palette)[] = ['ink', 'muted', 'faint', 'brandInk', 'scoot', 'neon', 'amber', 'danger'];

const PAIRS: Pair[] = [
  ...SURFACES.flatMap((bg) => TEXT_ON_SURFACES.map((fg): Pair => [fg, bg, AA_TEXT])),
  // Tinted badges and pills.
  ['brandInk', 'brandDim', AA_TEXT],
  ['scoot', 'scootDim', AA_TEXT],
  ['neon', 'neonDim', AA_TEXT],
  ['amber', 'amberDim', AA_TEXT],
  ['danger', 'dangerDim', AA_TEXT],
  ['ink', 'elevated', AA_TEXT],
  // Solid buttons.
  ['onAccent', 'brand', AA_TEXT],
  ['canvas', 'scoot', AA_TEXT],
  ['canvas', 'neon', AA_TEXT],
  ['canvas', 'danger', AA_TEXT],
  ['canvas', 'ink', AA_TEXT],
  // Icons.
  ['idle', 'surface', AA_GRAPHIC],
  ['brandInk', 'surface', AA_GRAPHIC],
];

const SCHEMES: ColorScheme[] = ['dark', 'light'];

describe.each(SCHEMES)('%s palette', (scheme) => {
  const t = themes[scheme];

  it.each(PAIRS.map(([fg, bg, min]) => [`${fg} on ${bg}`, fg, bg, min] as const))(
    '%s is readable',
    (_label, fg, bg, min) => {
      expect(contrastRatio(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
    },
  );

  it('keeps white hero text readable on every gradient stop', () => {
    for (const stops of Object.values(gradients[scheme])) {
      for (const stop of stops) expect(contrastRatio('#FFFFFF', stop)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('keeps every player color visible, and its + icon readable', () => {
    for (const color of playerColors[scheme]) {
      expect(contrastRatio(color, t.surface)).toBeGreaterThanOrEqual(AA_GRAPHIC);
      expect(contrastRatio(t.canvas, color)).toBeGreaterThanOrEqual(AA_GRAPHIC);
    }
  });

  it('defines the same tokens as the other scheme', () => {
    const other = themes[scheme === 'dark' ? 'light' : 'dark'];
    expect(Object.keys(t).sort()).toEqual(Object.keys(other).sort());
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#123456', '#123456')).toBe(1);
  });
});
