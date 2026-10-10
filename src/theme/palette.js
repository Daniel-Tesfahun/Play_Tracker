/**
 * Single source of truth for the palette. tailwind.config.js requires this file,
 * so class names (bg-surface, text-neon, ...) and raw values used by
 * non-className props (icons, tab bar, borders driven by state) never drift apart.
 */
module.exports = {
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
};
