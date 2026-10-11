/**
 * Single source of truth for colors. Each token has a light and a dark value.
 * tailwind.config.js maps tokens to CSS variables (bg-surface, text-neon, ...),
 * and components that need raw values (icons, tab bar) read them via usePalette().
 */
const themes = {
  dark: {
    canvas: '#0A0A0B',
    surface: '#141416',
    elevated: '#1C1C1F',
    line: '#26262B',
    lineStrong: '#34343B',
    ink: '#F4F4F5',
    muted: '#A1A1AA',
    faint: '#63636B',
    neon: '#4ADE80',
    neonDim: '#12291B',
    amber: '#FBBF24',
    amberDim: '#33270B',
    danger: '#F87171',
    dangerDim: '#341616',
    idle: '#71717A',
  },
  light: {
    canvas: '#F5F5F6',
    surface: '#FFFFFF',
    elevated: '#F0F0F2',
    line: '#E4E4E7',
    lineStrong: '#D1D1D6',
    ink: '#0A0A0B',
    muted: '#52525B',
    faint: '#8B8B94',
    neon: '#16A34A',
    neonDim: '#DCFCE7',
    amber: '#B45309',
    amberDim: '#FEF3C7',
    danger: '#DC2626',
    dangerDim: '#FEE2E2',
    idle: '#71717A',
  },
};

const tokens = Object.keys(themes.dark);

/** "#4ADE80" -> "74 222 128", the channel format Tailwind's <alpha-value> needs. */
function hexToChannels(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** CSS variable map for one scheme, e.g. { '--color-canvas': '10 10 11', ... }. */
function cssVariables(scheme) {
  return Object.fromEntries(
    tokens.map((t) => [`--color-${t}`, hexToChannels(themes[scheme][t])]),
  );
}

/** Tailwind color entries that resolve through the CSS variables. */
const tailwindColors = Object.fromEntries(
  tokens.map((t) => [t, `rgb(var(--color-${t}) / <alpha-value>)`]),
);

module.exports = { themes, tokens, hexToChannels, cssVariables, tailwindColors };
