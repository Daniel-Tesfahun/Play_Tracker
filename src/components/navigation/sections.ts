import type { Palette } from '@/theme/palette';

export interface SectionInfo {
  title: string;
  description: string;
  icon: 'game-controller' | 'scooter';
  accent: keyof Palette;
  /** Full class name (not built at runtime) so Tailwind can see it. */
  tileClass: string;
}

/** Keyed by route name in src/app/(tabs). */
export const SECTIONS: Record<string, SectionInfo> = {
  index: {
    title: 'PS',
    description: 'PlayStation stations, game counts, and players',
    icon: 'game-controller',
    accent: 'brand',
    tileClass: 'bg-brandDim',
  },
  scooters: {
    title: 'Scooters',
    description: 'Rental rides, timers, and booked time',
    icon: 'scooter',
    accent: 'scoot',
    tileClass: 'bg-scootDim',
  },
};
