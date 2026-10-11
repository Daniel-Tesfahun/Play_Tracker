import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';

import * as repo from '@/db/scootersRepo';
import type { Database, Scooter, ScooterDayStats } from '@/db/types';
import { queryKeys } from '@/data/queryKeys';
import { patchQuery, useOptimisticMutation } from '@/data/useOptimisticMutation';
import { addAllocation } from '@/lib/timer';

import { useToday } from './useToday';

const EMPTY: Scooter[] = [];
const NO_STATS: ScooterDayStats = { sessionsToday: 0, minutesToday: 0 };
const idle = (s: Scooter): Scooter => ({ ...s, startedAt: null, allocatedMinutes: 0, pausedAt: null, pausedMs: 0 });

/** Scooters and today's ride stats, cached by TanStack Query; actions update the cache first. */
export function useScooters() {
  const db: Database = useSQLiteContext();
  const qc = useQueryClient();
  const day = useToday();
  const listKey = queryKeys.scooters;
  const statsKey = queryKeys.scooterStats(day);

  const list = useQuery({ queryKey: listKey, queryFn: () => repo.listScooters(db) });
  const stats = useQuery({ queryKey: statsKey, queryFn: () => repo.getScooterDayStats(db, day) });
  const scooters = list.data ?? EMPTY;

  const mapScooter = (id: number, update: (s: Scooter) => Scooter) =>
    patchQuery<Scooter[]>(qc, listKey, (all) => all.map((s) => (s.id === id ? update(s) : s)));

  const allocateM = useOptimisticMutation<{ id: number; minutes: number }>({
    mutationFn: ({ id, minutes }) => repo.allocateMinutes(db, id, minutes),
    apply: (_, { id, minutes }) =>
      mapScooter(id, (s) => ({ ...s, allocatedMinutes: addAllocation(s.allocatedMinutes, minutes) })),
    resync: [listKey],
  });

  const clearM = useOptimisticMutation<number>({
    mutationFn: (id) => repo.clearAllocation(db, id),
    apply: (_, id) => mapScooter(id, (s) => ({ ...s, allocatedMinutes: 0 })),
    resync: [listKey],
  });

  const startM = useOptimisticMutation<{ id: number; at: number }>({
    mutationFn: ({ id, at }) => repo.startSession(db, id, at),
    apply: (_, { id, at }) =>
      mapScooter(id, (s) => (s.startedAt !== null ? s : { ...s, startedAt: at, pausedAt: null, pausedMs: 0 })),
    resync: [listKey],
  });

  const pauseM = useOptimisticMutation<{ id: number; at: number }>({
    mutationFn: ({ id, at }) => repo.pauseSession(db, id, at),
    apply: (_, { id, at }) =>
      mapScooter(id, (s) => (s.startedAt === null || s.pausedAt !== null ? s : { ...s, pausedAt: at })),
    resync: [listKey],
  });

  const resumeM = useOptimisticMutation<{ id: number; at: number }>({
    mutationFn: ({ id, at }) => repo.resumeSession(db, id, at),
    apply: (_, { id, at }) =>
      mapScooter(id, (s) =>
        s.pausedAt === null ? s : { ...s, pausedAt: null, pausedMs: s.pausedMs + Math.max(0, at - s.pausedAt) },
      ),
    resync: [listKey],
  });

  // Ending a ride changes today's totals, which are computed in SQL, so re-read stats after.
  const stopM = useOptimisticMutation<{ id: number; at: number }>({
    mutationFn: ({ id, at }) => repo.stopSession(db, id, at),
    apply: (_, { id }) => mapScooter(id, idle),
    refetch: () => [statsKey],
    resync: [listKey, statsKey],
  });

  const resetM = useOptimisticMutation<number>({
    mutationFn: (id) => repo.resetScooter(db, id),
    apply: (_, id) => mapScooter(id, idle),
    resync: [listKey],
  });

  const resetDayM = useOptimisticMutation<void>({
    mutationFn: () => repo.resetScootersDay(db),
    apply: (client) => {
      patchQuery<Scooter[]>(client, listKey, (all) => all.map(idle));
      patchQuery<ScooterDayStats>(client, statsKey, () => NO_STATS);
    },
    resync: [listKey, statsKey],
  });

  const renameM = useOptimisticMutation<{ id: number; name: string }>({
    mutationFn: ({ id, name }) => repo.renameScooter(db, id, name),
    apply: (_, { id, name }) => mapScooter(id, (s) => ({ ...s, name: name.trim() })),
    resync: [listKey],
  });

  const removeM = useOptimisticMutation<number>({
    mutationFn: (id) => repo.deleteScooter(db, id),
    apply: (client, id) => patchQuery<Scooter[]>(client, listKey, (all) => all.filter((s) => s.id !== id)),
    refetch: () => [statsKey],
    resync: [listKey, statsKey],
  });

  const addM = useOptimisticMutation<string>({
    mutationFn: (name) => repo.addScooter(db, name),
    refetch: () => [listKey],
    resync: [listKey],
  });

  return {
    scooters,
    stats: stats.data ?? NO_STATS,
    loaded: list.isSuccess,
    allocate: (id: number, minutes: number) => {
      void Haptics.selectionAsync();
      allocateM.mutate({ id, minutes });
    },
    clearAllocation: (id: number) => clearM.mutate(id),
    start: (id: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startM.mutate({ id, at: Date.now() });
    },
    pause: (id: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pauseM.mutate({ id, at: Date.now() });
    },
    resume: (id: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      resumeM.mutate({ id, at: Date.now() });
    },
    stop: (id: number) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      stopM.mutate({ id, at: Date.now() });
    },
    /** Cancel without logging: clears the ride and any booked time. */
    reset: (id: number) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      resetM.mutate(id);
    },
    resetDay: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      resetDayM.mutate();
    },
    addScooter: () => addM.mutate(`Scooter ${scooters.length + 1}`),
    rename: (id: number, name: string) => renameM.mutate({ id, name }),
    remove: (id: number) => removeM.mutate(id),
  };
}
