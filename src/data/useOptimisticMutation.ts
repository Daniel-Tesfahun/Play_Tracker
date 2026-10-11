import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

/** Applies `update` to a cached query in place; no-op if it hasn't loaded yet. */
export function patchQuery<T>(qc: QueryClient, key: QueryKey, update: (data: T) => T): void {
  void qc.cancelQueries({ queryKey: key });
  qc.setQueryData<T>(key, (old) => (old === undefined ? old : update(old)));
}

interface Options<TVars> {
  /** The SQLite write. */
  mutationFn: (vars: TVars) => Promise<unknown>;
  /** Predict the result in the cache right away (synchronously, before the write). */
  apply?: (qc: QueryClient, vars: TVars) => void;
  /** Queries to re-read after a successful write (for results the UI can't predict). */
  refetch?: (vars: TVars) => QueryKey[];
  /** Queries to re-sync from SQLite if the write fails, discarding the prediction. */
  resync: QueryKey[];
}

/**
 * The cache-first write pattern used by every action: the screen updates
 * on the same frame as the tap, SQLite catches up in the background.
 *
 * Failures re-read from the database instead of restoring a snapshot, so
 * several fast taps in flight can't roll each other back.
 */
export function useOptimisticMutation<TVars>({ mutationFn, apply, refetch, resync }: Options<TVars>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: (vars) => {
      apply?.(qc, vars);
    },
    onError: () => {
      for (const key of resync) void qc.invalidateQueries({ queryKey: key });
    },
    onSuccess: (_result, vars) => {
      for (const key of refetch?.(vars) ?? []) void qc.invalidateQueries({ queryKey: key });
    },
  });
}
