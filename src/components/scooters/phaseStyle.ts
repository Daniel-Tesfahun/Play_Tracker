import type { TimerPhase } from '@/lib/timer';
import type { Palette } from '@/theme/palette';

interface PhaseStyle {
  label: string;
  /** Palette token for icons and the progress fill. */
  color: keyof Palette;
  border: string;
  badge: string;
  badgeText: string;
}

export const phaseStyle: Record<TimerPhase, PhaseStyle> = {
  idle: {
    label: 'Idle',
    color: 'idle',
    border: 'border-line',
    badge: 'bg-elevated',
    badgeText: 'text-muted',
  },
  open: {
    label: 'Riding',
    color: 'neon',
    border: 'border-neon/30',
    badge: 'bg-neonDim',
    badgeText: 'text-neon',
  },
  active: {
    label: 'Riding',
    color: 'neon',
    border: 'border-neon/30',
    badge: 'bg-neonDim',
    badgeText: 'text-neon',
  },
  warning: {
    label: 'Ending soon',
    color: 'amber',
    border: 'border-amber/50',
    badge: 'bg-amberDim',
    badgeText: 'text-amber',
  },
  expired: {
    label: 'Overtime',
    color: 'danger',
    border: 'border-danger/60',
    badge: 'bg-dangerDim',
    badgeText: 'text-danger',
  },
};
