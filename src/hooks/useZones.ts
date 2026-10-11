import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

import type { Database, Zone } from '@/db/types';
import * as repo from '@/db/zonesRepo';
import { queryKeys } from '@/data/queryKeys';
import { patchQuery, useOptimisticMutation } from '@/data/useOptimisticMutation';
import { applyIncrement, nextZoneName } from '@/lib/gaming';

import { useToday } from './useToday';

const EMPTY: Zone[] = [];

const clearCounts = (zone: Zone): Zone => ({
  ...zone,
  gamesToday: 0,
  unassignedToday: 0,
  players: zone.players.map((p) => ({ ...p, gamesToday: 0 })),
});

/** Zones for today, cached by TanStack Query; every action updates the cache before SQLite. */
export function useZones() {
  const db: Database = useSQLiteContext();
  const qc = useQueryClient();
  const day = useToday();
  const key = queryKeys.zones(day);

  const query = useQuery({ queryKey: key, queryFn: () => repo.listZones(db, day) });
  const zones = query.data ?? EMPTY;
  const patch = (update: (list: Zone[]) => Zone[]) => patchQuery<Zone[]>(qc, key, update);
  const mapZone = (zoneId: number, update: (zone: Zone) => Zone) =>
    patch((list) => list.map((z) => (z.id === zoneId ? update(z) : z)));

  const incrementM = useOptimisticMutation<{ zoneId: number; playerId: number | null }>({
    mutationFn: ({ zoneId, playerId }) => repo.incrementZone(db, zoneId, Date.now(), playerId),
    apply: (_, { zoneId, playerId }) => patch((list) => applyIncrement(list, zoneId, 1, playerId)),
    resync: [key],
  });

  const decrementPlayerM = useOptimisticMutation<{ zoneId: number; playerId: number }>({
    mutationFn: ({ playerId }) => repo.decrementPlayer(db, playerId),
    apply: (_, { zoneId, playerId }) => patch((list) => applyIncrement(list, zoneId, -1, playerId)),
    resync: [key],
  });

  // Undo removes whichever play was latest, so we can't predict which player; re-read after.
  const undoM = useOptimisticMutation<number>({
    mutationFn: (zoneId) => repo.decrementZone(db, zoneId),
    refetch: () => [key],
    resync: [key],
  });

  const updateM = useOptimisticMutation<{ zoneId: number; name: string; currentGame: string | null }>({
    mutationFn: ({ zoneId, ...details }) => repo.updateZone(db, zoneId, details),
    apply: (_, { zoneId, name, currentGame }) =>
      mapZone(zoneId, (z) => ({ ...z, name: name.trim(), currentGame: currentGame?.trim() || null })),
    resync: [key],
  });

  const resetM = useOptimisticMutation<number>({
    mutationFn: (zoneId) => repo.resetZoneToday(db, zoneId),
    apply: (_, zoneId) => mapZone(zoneId, clearCounts),
    resync: [key],
  });

  const resetAllM = useOptimisticMutation<void>({
    mutationFn: () => repo.resetAllZonesToday(db),
    apply: () => patch((list) => list.map(clearCounts)),
    resync: [key],
  });

  const deleteM = useOptimisticMutation<number>({
    mutationFn: (zoneId) => repo.deleteZone(db, zoneId),
    apply: (_, zoneId) => patch((list) => list.filter((z) => z.id !== zoneId)),
    resync: [key],
  });

  // New rows need their SQLite ids, so these re-read once the write lands.
  const addZoneM = useOptimisticMutation<string>({
    mutationFn: (name) => repo.addZone(db, name),
    refetch: () => [key],
    resync: [key],
  });

  const addPlayerM = useOptimisticMutation<{ zoneId: number; name: string }>({
    mutationFn: ({ zoneId, name }) => repo.addPlayer(db, zoneId, name),
    refetch: () => [key],
    resync: [key],
  });

  const renamePlayerM = useOptimisticMutation<{ playerId: number; name: string }>({
    mutationFn: ({ playerId, name }) => repo.renamePlayer(db, playerId, name),
    apply: (_, { playerId, name }) =>
      patch((list) =>
        list.map((z) => ({
          ...z,
          players: z.players.map((p) => (p.id === playerId ? { ...p, name: name.trim() } : p)),
        })),
      ),
    resync: [key],
  });

  const removePlayerM = useOptimisticMutation<number>({
    mutationFn: (playerId) => repo.removePlayer(db, playerId),
    apply: (_, playerId) =>
      patch((list) =>
        list.map((z) => {
          const player = z.players.find((p) => p.id === playerId);
          if (!player) return z;
          // Their games stay on the zone, now as unassigned.
          return {
            ...z,
            players: z.players.filter((p) => p.id !== playerId),
            unassignedToday: z.unassignedToday + player.gamesToday,
          };
        }),
      ),
    resync: [key],
  });

  // ---- Bulk (selection mode)
  const setGameManyM = useOptimisticMutation<{ ids: number[]; game: string | null }>({
    mutationFn: ({ ids, game }) => repo.setZonesGame(db, ids, game),
    apply: (_, { ids, game }) => {
      const set = new Set(ids);
      patch((list) => list.map((z) => (set.has(z.id) ? { ...z, currentGame: game?.trim() || null } : z)));
    },
    resync: [key],
  });

  const resetManyM = useOptimisticMutation<number[]>({
    mutationFn: (ids) => repo.resetZonesToday(db, ids),
    apply: (_, ids) => {
      const set = new Set(ids);
      patch((list) => list.map((z) => (set.has(z.id) ? clearCounts(z) : z)));
    },
    resync: [key],
  });

  const deleteManyM = useOptimisticMutation<number[]>({
    mutationFn: (ids) => repo.deleteZones(db, ids),
    apply: (_, ids) => {
      const set = new Set(ids);
      patch((list) => list.filter((z) => !set.has(z.id)));
    },
    resync: [key],
  });

  const titleBreakdown = useCallback((zoneId: number) => repo.zoneTitleBreakdown(db, zoneId, day), [db, day]);

  return {
    zones,
    loaded: query.isSuccess,
    increment: (zoneId: number, playerId: number | null = null) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      incrementM.mutate({ zoneId, playerId });
    },
    decrementPlayer: (zoneId: number, playerId: number) => {
      void Haptics.selectionAsync();
      decrementPlayerM.mutate({ zoneId, playerId });
    },
    undoLast: (zoneId: number) => {
      void Haptics.selectionAsync();
      undoM.mutate(zoneId);
    },
    addZone: () => addZoneM.mutate(nextZoneName(zones)),
    updateZone: (zoneId: number, details: { name: string; currentGame: string | null }) =>
      updateM.mutate({ zoneId, ...details }),
    resetToday: (zoneId: number) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      resetM.mutate(zoneId);
    },
    resetAllToday: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      resetAllM.mutate();
    },
    deleteZone: (zoneId: number) => deleteM.mutate(zoneId),
    addPlayer: (zoneId: number, name: string) => addPlayerM.mutate({ zoneId, name }),
    renamePlayer: (playerId: number, name: string) => renamePlayerM.mutate({ playerId, name }),
    removePlayer: (playerId: number) => removePlayerM.mutate(playerId),
    titleBreakdown,
    setGameMany: (ids: number[], game: string | null) => setGameManyM.mutate({ ids, game }),
    resetMany: (ids: number[]) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      resetManyM.mutate(ids);
    },
    deleteMany: (ids: number[]) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      deleteManyM.mutate(ids);
    },
  };
}
