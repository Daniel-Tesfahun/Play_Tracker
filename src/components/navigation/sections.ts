import type { Palette } from '@/theme/palette';

export type SectionId = 'ps' | 'scooters';

export interface SectionInfo {
  id: SectionId;
  title: string;
  description: string;
  href: '/ps' | '/scooters';
  icon: 'game-controller' | 'scooter';
  /** Accent for icons and text on surfaces. */
  accent: keyof Palette;
  /** Which hero gradient the section uses (see palette.js gradients). */
  gradient: 'zones' | 'scooters';
}

export const SECTIONS: Record<SectionId, SectionInfo> = {
  ps: {
    id: 'ps',
    title: 'PS',
    description: 'Stations, game counts, and players',
    href: '/ps',
    icon: 'game-controller',
    accent: 'brandInk',
    gradient: 'zones',
  },
  scooters: {
    id: 'scooters',
    title: 'Scooters',
    description: 'Rentals, ride timers, and booked time',
    href: '/scooters',
    icon: 'scooter',
    accent: 'scoot',
    gradient: 'scooters',
  },
};
