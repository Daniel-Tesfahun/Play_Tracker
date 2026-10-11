import type { TimerPhase } from '@/lib/timer';
import type { Palette } from '@/theme/palette';

interface PhaseStyle {
  label: string;
  /** Palette token for icons and the progress fill. */
  color: keyof Palette;
  border: string;
  /** Accent strip along the top of the card. */
  strip: string;
  badge: string;
  badgeText: string;
}

export const phaseStyle: Record<TimerPhase, PhaseStyle> = {
  idle: {
    label: 'Idle',
    color: 'idle',
    border: 'border-line',
    strip: 'bg-transparent',
    badge: 'bg-elevated',
    badgeText: 'text-muted',
  },
  open: {
    label: 'Riding',
    color: 'neon',
    border: 'border-neon/40',
    strip: 'bg-neon',
    badge: 'bg-neonDim',
    badgeText: 'text-neon',
  },
  active: {
    label: 'Riding',
    color: 'neon',
    border: 'border-neon/40',
    strip: 'bg-neon',
    badge: 'bg-neonDim',
    badgeText: 'text-neon',
  },
  warning: {
    label: 'Ending soon',
    color: 'amber',
    border: 'border-amber/60',
    strip: 'bg-amber',
    badge: 'bg-amberDim',
    badgeText: 'text-amber',
  },
  expired: {
    label: 'Overtime',
    color: 'danger',
    border: 'border-danger/70',
    strip: 'bg-danger',
    badge: 'bg-dangerDim',
    badgeText: 'text-danger',
  },
};

/** Overrides the phase look while a ride is on hold, whatever its phase. */
export const pausedStyle: PhaseStyle = {
  label: 'Paused',
  color: 'muted',
  border: 'border-lineStrong border-dashed',
  strip: 'bg-muted',
  badge: 'bg-elevated',
  badgeText: 'text-ink',
};
