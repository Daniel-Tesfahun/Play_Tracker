import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import type { Database, Zone } from '@/db/types';
import * as repo from '@/db/zonesRepo';
import { applyIncrement, nextZoneName } from '@/lib/gaming';

import { useRefreshOnFocus } from './useRefreshOnFocus';

export function useZones() {
  const db: Database = useSQLiteContext();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setZones(await repo.listZones(db));
    setLoaded(true);
  }, [db]);

  useRefreshOnFocus(reload);

  /** Runs a write, then re-reads so the UI always ends up matching the database. */
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

  // Taps are optimistic and don't re-read on success, so rapid taps never flicker
  // back to a stale count; a failed write re-syncs from the database.
  const resyncOnError = useCallback(
    (write: Promise<unknown>) => {
      write.catch(() => reload());
    },
    [reload],
  );

  const increment = useCallback(
    (zoneId: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setZones((prev) => applyIncrement(prev, zoneId, 1));
      resyncOnError(repo.incrementZone(db, zoneId));
    },
    [db, resyncOnError],
  );

  const decrement = useCallback(
    (zoneId: number) => {
      setZones((prev) => applyIncrement(prev, zoneId, -1));
      resyncOnError(repo.decrementZone(db, zoneId));
    },
    [db, resyncOnError],
  );

  const titleBreakdown = useCallback((zoneId: number) => repo.zoneTitleBreakdown(db, zoneId), [db]);

  return {
    zones,
    loaded,
    increment,
    decrement,
    addZone: () => mutate(() => repo.addZone(db, nextZoneName(zones))),
    updateZone: (zoneId: number, details: { name: string; currentGame: string | null }) =>
      mutate(() => repo.updateZone(db, zoneId, details)),
    resetToday: (zoneId: number) => mutate(() => repo.resetZoneToday(db, zoneId)),
    deleteZone: (zoneId: number) => mutate(() => repo.deleteZone(db, zoneId)),
    titleBreakdown,
  };
}
