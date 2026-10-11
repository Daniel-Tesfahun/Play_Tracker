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

  // ---- Bulk (selection mode). Patches mirror the SQL guards in scootersRepo.
  const mapMany = (ids: number[], update: (s: Scooter) => Scooter) => {
    const set = new Set(ids);
    patchQuery<Scooter[]>(qc, listKey, (all) => all.map((s) => (set.has(s.id) ? update(s) : s)));
  };

  const startManyM = useOptimisticMutation<{ ids: number[]; at: number }>({
    mutationFn: ({ ids, at }) => repo.startSessions(db, ids, at),
    apply: (_, { ids, at }) =>
      mapMany(ids, (s) => (s.startedAt !== null ? s : { ...s, startedAt: at, pausedAt: null, pausedMs: 0 })),
    resync: [listKey],
  });

  const pauseManyM = useOptimisticMutation<{ ids: number[]; at: number }>({
    mutationFn: ({ ids, at }) => repo.pauseSessions(db, ids, at),
    apply: (_, { ids, at }) =>
      mapMany(ids, (s) => (s.startedAt === null || s.pausedAt !== null ? s : { ...s, pausedAt: at })),
    resync: [listKey],
  });

  const resumeManyM = useOptimisticMutation<{ ids: number[]; at: number }>({
    mutationFn: ({ ids, at }) => repo.resumeSessions(db, ids, at),
    apply: (_, { ids, at }) =>
      mapMany(ids, (s) =>
        s.pausedAt === null ? s : { ...s, pausedAt: null, pausedMs: s.pausedMs + Math.max(0, at - s.pausedAt) },
      ),
    resync: [listKey],
  });

  const allocateManyM = useOptimisticMutation<{ ids: number[]; minutes: number }>({
    mutationFn: ({ ids, minutes }) => repo.allocateMinutesMany(db, ids, minutes),
    apply: (_, { ids, minutes }) =>
      mapMany(ids, (s) => ({ ...s, allocatedMinutes: addAllocation(s.allocatedMinutes, minutes) })),
    resync: [listKey],
  });

  const stopManyM = useOptimisticMutation<{ ids: number[]; at: number }>({
    mutationFn: ({ ids, at }) => repo.stopSessions(db, ids, at),
    apply: (_, { ids }) => mapMany(ids, (s) => (s.startedAt === null ? s : idle(s))),
    refetch: () => [statsKey],
    resync: [listKey, statsKey],
  });

  const resetManyM = useOptimisticMutation<number[]>({
    mutationFn: (ids) => repo.resetScooters(db, ids),
    apply: (_, ids) => mapMany(ids, idle),
    resync: [listKey],
  });

  const deleteManyM = useOptimisticMutation<number[]>({
    mutationFn: (ids) => repo.deleteScooters(db, ids),
    apply: (client, ids) => {
      const set = new Set(ids);
      patchQuery<Scooter[]>(client, listKey, (all) => all.filter((s) => !set.has(s.id)));
    },
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
    startMany: (ids: number[]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startManyM.mutate({ ids, at: Date.now() });
    },
    pauseMany: (ids: number[]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pauseManyM.mutate({ ids, at: Date.now() });
    },
    resumeMany: (ids: number[]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      resumeManyM.mutate({ ids, at: Date.now() });
    },
    allocateMany: (ids: number[], minutes: number) => {
      void Haptics.selectionAsync();
      allocateManyM.mutate({ ids, minutes });
    },
    stopMany: (ids: number[]) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      stopManyM.mutate({ ids, at: Date.now() });
    },
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
