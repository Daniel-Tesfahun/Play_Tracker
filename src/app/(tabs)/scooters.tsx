import { useMemo, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScooterCard } from '@/components/scooters/ScooterCard';
import { ScooterEditSheet } from '@/components/scooters/ScooterEditSheet';
import { AddTile } from '@/components/ui/AddTile';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionToolbar } from '@/components/ui/SectionToolbar';
import { StatTile } from '@/components/ui/StatTile';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Scooter } from '@/db/types';
import { useClockPrefs } from '@/hooks/useClockPrefs';
import { useNow } from '@/hooks/useNow';
import { useScooters } from '@/hooks/useScooters';
import { confirmDestructive } from '@/lib/confirm';
import { toGridRows } from '@/lib/grid';
import { computeTimerState } from '@/lib/timer';
import { formatClock, formatMinutes, formatTimeZoneName } from '@/lib/time';
import { usePalette } from '@/theme/usePalette';

export default function ScootersScreen() {
  const s = useScooters();
  const c = usePalette();
  const clock = useClockPrefs();
  const { width } = useWindowDimensions();
  const columns = width >= 640 ? 2 : 1;
  const [editingId, setEditingId] = useState<number | null>(null);

  const anyRunning = s.scooters.some((sc) => sc.startedAt !== null);
  // Tick every second while a ride runs; otherwise just keep the header clock current.
  const now = useNow(true, anyRunning ? 1000 : 15_000);

  const riding = s.scooters.filter((sc) => sc.startedAt !== null).length;
  const overtime = s.scooters.filter(
    (sc) => computeTimerState(sc.startedAt, sc.allocatedMinutes, now).phase === 'expired',
  ).length;
  const busy = riding > 0 || s.scooters.some((sc) => sc.allocatedMinutes > 0);

  const rows = useMemo(() => toGridRows(s.scooters, columns), [s.scooters, columns]);
  const editing = s.scooters.find((sc) => sc.id === editingId) ?? null;

  const zoneName = formatTimeZoneName(now, clock);
  const eyebrow = `Local time ${formatClock(now, clock)}${zoneName ? ` · ${zoneName}` : ''}`;

  const resetScooter = (scooter: Scooter) => {
    if (scooter.startedAt === null) {
      void s.reset(scooter.id);
      return;
    }
    confirmDestructive(
      'Cancel ride',
      `Cancel the ride on ${scooter.name}? It won't be saved to today's rides.`,
      'Cancel ride',
      () => void s.reset(scooter.id),
    );
  };

  const resetDay = () =>
    confirmDestructive(
      'Reset day',
      `Cancel ${riding} running ${riding === 1 ? 'ride' : 'rides'}, clear booked time, and clear today's ${s.stats.sessionsToday} saved rides?`,
      'Reset day',
      () => void s.resetDay(),
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <FlatList
        data={rows}
        key={columns}
        keyExtractor={(_, i) => `row-${i}`}
        extraData={now}
        contentContainerClassName="px-4 pb-8"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              eyebrow={eyebrow}
              title="Scooters"
              actions={
                <>
                  <ThemeToggle />
                  <IconButton
                    icon="add"
                    label="Add scooter"
                    variant="filled"
                    color={c.ink}
                    onPress={() => void s.addScooter()}
                  />
                </>
              }
            />
            <View className="flex-row gap-3">
              <StatTile
                label="Riding"
                value={`${riding}/${s.scooters.length}`}
                tone={riding > 0 ? 'text-neon' : 'text-ink'}
                caption={overtime > 0 ? `${overtime} in overtime` : 'on the road'}
              />
              <StatTile label="Rides" value={String(s.stats.sessionsToday)} caption="completed today" />
              <StatTile label="Ride time" value={formatMinutes(s.stats.minutesToday)} caption="billed today" />
            </View>
            <SectionToolbar
              title={`Fleet · ${s.scooters.length}`}
              resetLabel="Reset day"
              onReset={resetDay}
              resetDisabled={!busy && s.stats.sessionsToday === 0}
              testID="scooters-reset-day"
            />
          </View>
        }
        renderItem={({ item: row }) => (
          <View className="flex-row gap-3">
            {row.map((cell) => {
              if (cell.kind === 'item') {
                return (
                  <ScooterCard
                    key={cell.item.id}
                    scooter={cell.item}
                    now={now}
                    clock={clock}
                    onAllocate={(id, m) => void s.allocate(id, m)}
                    onClearAllocation={(id) => void s.clearAllocation(id)}
                    onStart={(id) => void s.start(id)}
                    onStop={(id) => void s.stop(id)}
                    onReset={resetScooter}
                    onEdit={(sc) => setEditingId(sc.id)}
                  />
                );
              }
              if (cell.kind === 'add') {
                return <AddTile key="add" label="Add scooter" minHeight={96} onPress={() => void s.addScooter()} />;
              }
              return <View key={cell.key} className="flex-1" />;
            })}
          </View>
        )}
      />

      <ScooterEditSheet
        scooter={editing}
        onClose={() => setEditingId(null)}
        onRename={(id, name) => void s.rename(id, name)}
        onDelete={(id) => void s.remove(id)}
      />
    </SafeAreaView>
  );
}
