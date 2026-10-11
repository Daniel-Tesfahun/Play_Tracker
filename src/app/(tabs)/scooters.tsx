import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScooterCard } from '@/components/scooters/ScooterCard';
import { ScooterEditSheet } from '@/components/scooters/ScooterEditSheet';
import { AddTile } from '@/components/ui/AddTile';
import { HeroCard, HeroPill } from '@/components/ui/HeroCard';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionToolbar } from '@/components/ui/SectionToolbar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Scooter } from '@/db/types';
import { useClockPrefs } from '@/hooks/useClockPrefs';
import { useCollapsed } from '@/hooks/useCollapsed';
import { useNow } from '@/hooks/useNow';
import { useScooters } from '@/hooks/useScooters';
import { confirmDestructive } from '@/lib/confirm';
import { toGridRows, type GridCell } from '@/lib/grid';
import { computeTimerState } from '@/lib/timer';
import { formatClock, formatMinutes, formatTimeZoneName } from '@/lib/time';
import { useGradients, usePalette } from '@/theme/usePalette';

type Row = GridCell<Scooter>[];

const rowKey = (row: Row) => row.map((cell) => (cell.kind === 'item' ? cell.item.id : cell.kind)).join('-');

export default function ScootersScreen() {
  const s = useScooters();
  const c = usePalette();
  const gradients = useGradients();
  const clock = useClockPrefs();
  const { width } = useWindowDimensions();
  const columns = width >= 640 ? 2 : 1;
  const listRef = useRef<FlashListRef<Row>>(null);
  const collapse = useCollapsed('scooters', () => listRef.current?.prepareForLayoutAnimationRender());
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
  const ids = s.scooters.map((sc) => sc.id);
  const allCollapsed = collapse.allCollapsed(ids);
  const editing = s.scooters.find((sc) => sc.id === editingId) ?? null;

  const zoneName = formatTimeZoneName(now, clock);
  const eyebrow = `Local time ${formatClock(now, clock)}${zoneName ? ` · ${zoneName}` : ''}`;

  const resetScooter = (scooter: Scooter) => {
    if (scooter.startedAt === null) {
      s.reset(scooter.id);
      return;
    }
    confirmDestructive(
      'Cancel ride',
      `Cancel the ride on ${scooter.name}? It won't be saved to today's rides.`,
      'Cancel ride',
      () => s.reset(scooter.id),
    );
  };

  const resetDay = () =>
    confirmDestructive(
      'Reset day',
      `Cancel ${riding} running ${riding === 1 ? 'ride' : 'rides'}, clear booked time, and clear today's ${s.stats.sessionsToday} saved rides?`,
      'Reset day',
      s.resetDay,
    );

  const header = (
    <View>
      <ScreenHeader
        eyebrow={eyebrow}
        title="Scooters"
        actions={
          <>
            <ThemeToggle />
            <IconButton icon="add" label="Add scooter" variant="filled" color={c.ink} onPress={s.addScooter} />
          </>
        }
      />
      <HeroCard
        label="Riding now"
        value={`${riding}/${s.scooters.length}`}
        caption={overtime > 0 ? `${overtime} in overtime` : riding > 0 ? 'on the road' : 'all scooters parked'}
        colors={gradients.scooters}
        testID="scooters-hero"
      >
        <HeroPill label="Rides today" value={String(s.stats.sessionsToday)} />
        <HeroPill label="Ride time" value={formatMinutes(s.stats.minutesToday)} />
      </HeroCard>
      <SectionToolbar
        title={`Fleet · ${s.scooters.length}`}
        resetLabel="Reset day"
        onReset={resetDay}
        resetDisabled={!busy && s.stats.sessionsToday === 0}
        allCollapsed={allCollapsed}
        onToggleAll={() => collapse.setAll(ids, !allCollapsed)}
        testID="scooters-reset-day"
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <FlashList
        ref={listRef}
        data={rows}
        keyExtractor={rowKey}
        getItemType={(row) => {
          const first = row[0];
          if (!first || first.kind !== 'item') return 'add';
          return collapse.isCollapsed(first.item.id) ? 'collapsed' : 'expanded';
        }}
        // Running timers re-render each second; idle lists only on real changes.
        extraData={`${now}-${allCollapsed}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
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
                    collapsed={collapse.isCollapsed(cell.item.id)}
                    onToggleCollapse={collapse.toggle}
                    onAllocate={s.allocate}
                    onClearAllocation={s.clearAllocation}
                    onStart={s.start}
                    onStop={s.stop}
                    onReset={resetScooter}
                    onEdit={(sc) => setEditingId(sc.id)}
                  />
                );
              }
              if (cell.kind === 'add') {
                return <AddTile key="add" label="Add scooter" minHeight={88} onPress={s.addScooter} />;
              }
              return <View key={cell.key} className="flex-1" />;
            })}
          </View>
        )}
      />

      <ScooterEditSheet
        scooter={editing}
        onClose={() => setEditingId(null)}
        onRename={s.rename}
        onDelete={s.remove}
      />
    </SafeAreaView>
  );
}
