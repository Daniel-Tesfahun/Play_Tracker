import { useEffect, useState } from 'react';

/** Current epoch ms, re-rendering every `intervalMs` only while `active` is true. */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    // Refresh right away so a timer that just started doesn't show a stale clock for a second.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, intervalMs]);

  return now;
}
