import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey } from '@/lib/time';

/**
 * Today's local day key. Rolls over at midnight and when the app returns to the
 * foreground, so cached "today" queries switch to a fresh day automatically.
 */
export function useToday(): string {
  const [day, setDay] = useState(() => dayKey());

  useEffect(() => {
    const refresh = () => setDay(dayKey());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = setTimeout(refresh, nextMidnight.getTime() - now.getTime());

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [day]);

  return day;
}
