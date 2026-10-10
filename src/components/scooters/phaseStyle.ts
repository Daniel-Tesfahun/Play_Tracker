import type { TimerPhase } from '@/lib/timer';
import palette from '@/theme/palette';

interface PhaseStyle {
  label: string;
  /** Raw color for icons and the progress fill. */
  color: string;
  border: string;
  badge: string;
  badgeText: string;
}

export const phaseStyle: Record<TimerPhase, PhaseStyle> = {
  idle: {
    label: 'Idle',
    color: palette.idle,
    border: 'border-line',
    badge: 'bg-elevated',
    badgeText: 'text-muted',
  },
  open: {
    label: 'Riding',
    color: palette.neon,
    border: 'border-neonDim',
    badge: 'bg-neonDim',
    badgeText: 'text-neon',
  },
  active: {
    label: 'Riding',
    color: palette.neon,
    border: 'border-neonDim',
    badge: 'bg-neonDim',
    badgeText: 'text-neon',
  },
  warning: {
    label: 'Ending soon',
    color: palette.amber,
    border: 'border-amber/50',
    badge: 'bg-amberDim',
    badgeText: 'text-amber',
  },
  expired: {
    label: 'Overtime',
    color: palette.danger,
    border: 'border-danger/60',
    badge: 'bg-dangerDim',
    badgeText: 'text-danger',
  },
};
