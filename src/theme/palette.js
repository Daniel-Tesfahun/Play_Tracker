/**
 * Single source of truth for colors. Each token has a light and a dark value.
 * tailwind.config.js maps tokens to CSS variables (bg-surface, text-brand, ...),
 * and components that need raw values (icons, gradients) read them via usePalette().
 *
 * Roles:
 *   brand  – Gaming Zones accent (violet)      scoot – Scooters accent (cyan)
 *   neon   – running / go (green)              amber – ending soon
 *   danger – overtime, destructive (red)      *Dim  – tinted fill behind that color
 */
const themes = {
  dark: {
    canvas: '#0B0D16',
    surface: '#141728',
    elevated: '#1D2136',
    line: '#272C45',
    lineStrong: '#363C5E',
    ink: '#EEF0FF',
    muted: '#A0A7C8',
    faint: '#6B7296',
    brand: '#8B5CF6',
    brandDim: '#241B4A',
    scoot: '#22D3EE',
    scootDim: '#0A3140',
    neon: '#34D399',
    neonDim: '#0D3329',
    amber: '#FBBF24',
    amberDim: '#3A2C0A',
    danger: '#F87171',
    dangerDim: '#3A1517',
    idle: '#7D84A6',
    onAccent: '#FFFFFF',
  },
  light: {
    canvas: '#F3F4FA',
    surface: '#FFFFFF',
    elevated: '#ECEEF8',
    line: '#E0E3F0',
    lineStrong: '#CDD2E6',
    ink: '#14162E',
    muted: '#575E80',
    faint: '#8D93B2',
    brand: '#7C3AED',
    brandDim: '#EEE8FE',
    scoot: '#0891B2',
    scootDim: '#DDF5FB',
    neon: '#059669',
    neonDim: '#D9F6EC',
    amber: '#D97706',
    amberDim: '#FDF0D5',
    danger: '#DC2626',
    dangerDim: '#FEE2E2',
    idle: '#7A809E',
    onAccent: '#FFFFFF',
  },
};

/** Hero card gradients, start → end. */
const gradients = {
  dark: {
    zones: ['#6D28D9', '#4338CA'],
    scooters: ['#0E7490', '#2563EB'],
  },
  light: {
    zones: ['#7C3AED', '#4F46E5'],
    scooters: ['#0891B2', '#3B82F6'],
  },
};

/** Distinct hues so each player on a zone is recognizable at a glance. */
const playerColors = {
  dark: ['#A78BFA', '#22D3EE', '#A3E635', '#FB923C', '#60A5FA', '#FACC15', '#2DD4BF', '#818CF8'],
  light: ['#7C3AED', '#0891B2', '#65A30D', '#EA580C', '#2563EB', '#CA8A04', '#0D9488', '#4F46E5'],
};

const tokens = Object.keys(themes.dark);

/** "#4ADE80" -> "74 222 128", the channel format Tailwind's <alpha-value> needs. */
function hexToChannels(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** CSS variable map for one scheme, e.g. { '--color-canvas': '11 13 22', ... }. */
function cssVariables(scheme) {
  return Object.fromEntries(tokens.map((t) => [`--color-${t}`, hexToChannels(themes[scheme][t])]));
}

/** Tailwind color entries that resolve through the CSS variables. */
const tailwindColors = Object.fromEntries(tokens.map((t) => [t, `rgb(var(--color-${t}) / <alpha-value>)`]));

module.exports = { themes, gradients, playerColors, tokens, hexToChannels, cssVariables, tailwindColors };
