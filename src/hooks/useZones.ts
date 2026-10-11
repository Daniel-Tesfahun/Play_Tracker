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

  /** +1 on a zone, credited to a player when one is given. */
  const increment = useCallback(
    (zoneId: number, playerId: number | null = null) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setZones((prev) => applyIncrement(prev, zoneId, 1, playerId));
      resyncOnError(repo.incrementZone(db, zoneId, Date.now(), playerId));
    },
    [db, resyncOnError],
  );

  const decrementPlayer = useCallback(
    (zoneId: number, playerId: number) => {
      void Haptics.selectionAsync();
      setZones((prev) => applyIncrement(prev, zoneId, -1, playerId));
      resyncOnError(repo.decrementPlayer(db, playerId));
    },
    [db, resyncOnError],
  );

  // Zone-level undo removes whichever play was latest, so we can't predict the
  // affected player; re-read instead of guessing.
  const undoLast = useCallback(
    (zoneId: number) => {
      void Haptics.selectionAsync();
      return mutate(() => repo.decrementZone(db, zoneId));
    },
    [db, mutate],
  );

  const titleBreakdown = useCallback((zoneId: number) => repo.zoneTitleBreakdown(db, zoneId), [db]);

  return {
    zones,
    loaded,
    increment,
    decrementPlayer,
    undoLast,
    addZone: () => mutate(() => repo.addZone(db, nextZoneName(zones))),
    updateZone: (zoneId: number, details: { name: string; currentGame: string | null }) =>
      mutate(() => repo.updateZone(db, zoneId, details)),
    resetToday: (zoneId: number) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return mutate(() => repo.resetZoneToday(db, zoneId));
    },
    resetAllToday: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return mutate(() => repo.resetAllZonesToday(db));
    },
    deleteZone: (zoneId: number) => mutate(() => repo.deleteZone(db, zoneId)),
    addPlayer: (zoneId: number, name: string) => mutate(() => repo.addPlayer(db, zoneId, name)),
    renamePlayer: (playerId: number, name: string) => mutate(() => repo.renamePlayer(db, playerId, name)),
    removePlayer: (playerId: number) => mutate(() => repo.removePlayer(db, playerId)),
    titleBreakdown,
  };
}
