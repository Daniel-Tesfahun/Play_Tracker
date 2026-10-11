import { notifyManager, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createQueryClient } from '../queryClient';
import { patchQuery, useOptimisticMutation } from '../useOptimisticMutation';

const KEY = ['counter'];

// TanStack batches renders on a timer by default; microtasks let act() flush them.
notifyManager.setScheduler(queueMicrotask);

// Finished mutations linger for gcTime (5 min by default), which would keep Jest alive.
const clients: ReturnType<typeof createQueryClient>[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

/** A fake "database" whose writes we resolve or fail by hand. */
function makeStore(initial: number) {
  let value = initial;
  const pending: { resolve: () => void; reject: (e: Error) => void }[] = [];
  return {
    read: jest.fn(async () => value),
    write: jest.fn(
      (delta: number) =>
        new Promise<void>((resolve, reject) => {
          pending.push({
            resolve: () => {
              value += delta;
              resolve();
            },
            reject,
          });
        }),
    ),
    settle: (ok: boolean) => {
      const next = pending.shift();
      if (!next) throw new Error('nothing pending');
      if (ok) next.resolve();
      else next.reject(new Error('disk full'));
    },
  };
}

function setup(initial = 0) {
  const store = makeStore(initial);
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, mutations: { ...defaults.mutations, gcTime: 0 } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const useCounter = () => {
    const query = useQuery({ queryKey: KEY, queryFn: store.read });
    const add = useOptimisticMutation<number>({
      mutationFn: store.write,
      apply: (qc, delta) => patchQuery<number>(qc, KEY, (n) => n + delta),
      resync: [KEY],
    });
    return { value: query.data, add: add.mutate };
  };
  return { store, wrapper, useCounter };
}

describe('useOptimisticMutation', () => {
  it('shows the change before the write finishes', async () => {
    const { store, wrapper, useCounter } = setup(5);
    const { result } = await renderHook(useCounter, { wrapper });
    await waitFor(() => expect(result.current.value).toBe(5));

    await act(async () => result.current.add(1));
    // The write is still pending, but the cache already shows it (on the next tick).
    expect(store.write).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.value).toBe(6));

    await act(async () => store.settle(true));
    expect(result.current.value).toBe(6);
  });

  it('keeps every fast tap, even with writes in flight', async () => {
    const { store, wrapper, useCounter } = setup(0);
    const { result } = await renderHook(useCounter, { wrapper });
    await waitFor(() => expect(result.current.value).toBe(0));

    await act(async () => {
      result.current.add(1);
      result.current.add(1);
      result.current.add(1);
    });
    await waitFor(() => expect(result.current.value).toBe(3));

    await act(async () => {
      store.settle(true);
      store.settle(true);
      store.settle(true);
    });
    expect(result.current.value).toBe(3);
  });

  it('re-syncs from the database when a write fails', async () => {
    const { store, wrapper, useCounter } = setup(10);
    const { result } = await renderHook(useCounter, { wrapper });
    await waitFor(() => expect(result.current.value).toBe(10));

    await act(async () => result.current.add(1));
    await waitFor(() => expect(result.current.value).toBe(11));

    await act(async () => store.settle(false));
    // The failed +1 never reached the store, so the re-read brings back 10.
    await waitFor(() => expect(result.current.value).toBe(10));
    expect(store.read).toHaveBeenCalledTimes(2);
  });

  it('serves repeat reads from the cache without touching the database', async () => {
    const { store, wrapper, useCounter } = setup(1);
    const first = await renderHook(useCounter, { wrapper });
    await waitFor(() => expect(first.result.current.value).toBe(1));

    const second = await renderHook(useCounter, { wrapper });
    expect(second.result.current.value).toBe(1);
    expect(store.read).toHaveBeenCalledTimes(1);
  });
});
