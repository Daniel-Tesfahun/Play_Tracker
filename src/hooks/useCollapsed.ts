import Storage from 'expo-sqlite/kv-store';
import { useState } from 'react';
import { LayoutAnimation } from 'react-native';

const storageKey = (scope: string) => `playtracker.collapsed.${scope}`;

function read(scope: string): Set<number> {
  try {
    const raw = Storage.getItemSync(storageKey(scope));
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is number => typeof id === 'number') : []);
  } catch {
    return new Set();
  }
}

/**
 * Which cards are collapsed, remembered on the device per list.
 * `beforeChange` runs right before the layout animates (FlashList needs a heads-up).
 */
export function useCollapsed(scope: 'zones' | 'scooters', beforeChange?: () => void) {
  const [collapsed, setCollapsed] = useState<Set<number>>(() => read(scope));

  const commit = (next: Set<number>) => {
    beforeChange?.();
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setCollapsed(next);
    try {
      Storage.setItemSync(storageKey(scope), JSON.stringify([...next]));
    } catch {
      // Not persisted; still applies for this session.
    }
  };

  return {
    isCollapsed: (id: number) => collapsed.has(id),
    toggle: (id: number) => {
      const next = new Set(collapsed);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commit(next);
    },
    /** True when every given card is collapsed. */
    allCollapsed: (ids: number[]) => ids.length > 0 && ids.every((id) => collapsed.has(id)),
    setAll: (ids: number[], value: boolean) => commit(value ? new Set(ids) : new Set()),
  };
}
