import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import * as repo from '@/db/scootersRepo';
import type { Database, Scooter, ScooterDayStats } from '@/db/types';

import { useRefreshOnFocus } from './useRefreshOnFocus';

export function useScooters() {
  const db: Database = useSQLiteContext();
  const [scooters, setScooters] = useState<Scooter[]>([]);
  const [stats, setStats] = useState<ScooterDayStats>({ sessionsToday: 0, minutesToday: 0 });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [list, day] = await Promise.all([repo.listScooters(db), repo.getScooterDayStats(db)]);
    setScooters(list);
    setStats(day);
    setLoaded(true);
  }, [db]);

  useRefreshOnFocus(reload);

  const mutate = useCallback(
    async (write: () => Promise<unknown>) => {
      try {
        await write();
      } finally {
        await reload();
      }
    },
    [reload],
  );

  return {
    scooters,
    stats,
    loaded,
    allocate: (id: number, minutes: number) => {
      void Haptics.selectionAsync();
      return mutate(() => repo.allocateMinutes(db, id, minutes));
    },
    clearAllocation: (id: number) => mutate(() => repo.clearAllocation(db, id)),
    start: (id: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return mutate(() => repo.startSession(db, id));
    },
    stop: (id: number) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return mutate(() => repo.stopSession(db, id));
    },
    /** Cancel without logging: clears the ride and any booked time. */
    reset: (id: number) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return mutate(() => repo.resetScooter(db, id));
    },
    resetDay: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return mutate(() => repo.resetScootersDay(db));
    },
    addScooter: () => mutate(() => repo.addScooter(db, `Scooter ${scooters.length + 1}`)),
    rename: (id: number, name: string) => mutate(() => repo.renameScooter(db, id, name)),
    remove: (id: number) => mutate(() => repo.deleteScooter(db, id)),
  };
}
