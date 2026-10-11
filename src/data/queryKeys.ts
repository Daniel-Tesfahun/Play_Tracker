/** Every cached query in one place, so invalidation can't drift from reads. */
export const queryKeys = {
  zones: (day: string) => ['zones', day] as const,
  zoneBreakdown: (zoneId: number, day: string) => ['zones', day, 'breakdown', zoneId] as const,
  scooters: ['scooters'] as const,
  scooterStats: (day: string) => ['scooterStats', day] as const,
};
