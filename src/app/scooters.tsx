import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomMinutesSheet } from '@/components/scooters/CustomMinutesSheet';
import { ScooterCard } from '@/components/scooters/ScooterCard';
import { ScooterEditSheet } from '@/components/scooters/ScooterEditSheet';
import { HeroCard, HeroPill } from '@/components/ui/HeroCard';
import { BottomDock, dockSpace } from '@/components/ui/BottomDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Scooter } from '@/db/types';
import { useClockPrefs } from '@/hooks/useClockPrefs';
import { useCollapsed } from '@/hooks/useCollapsed';
import { useNow } from '@/hooks/useNow';
import { useScooters } from '@/hooks/useScooters';
import { confirmDestructive } from '@/lib/confirm';
import { goHome } from '@/lib/navigation';
import { toGridRows, type GridCell } from '@/lib/grid';
import { computeTimerState } from '@/lib/timer';
import { formatClock, formatMinutes, formatTimeZoneName } from '@/lib/time';
import { useGradients } from '@/theme/usePalette';

type Row = GridCell<Scooter>[];

const rowKey = (row: Row) => row.map((cell) => (cell.kind === 'item' ? cell.item.id : cell.kind)).join('-');

export default function ScootersScreen() {
  const s = useScooters();
  const gradients = useGradients();
  const insets = useSafeAreaInsets();
  const clock = useClockPrefs();
  const { width } = useWindowDimensions();
  const columns = width >= 640 ? 2 : 1;
  const listRef = useRef<FlashListRef<Row>>(null);
  const collapse = useCollapsed('scooters', () => listRef.current?.prepareForLayoutAnimationRender());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [customFor, setCustomFor] = useState<number | null>(null);

  // Paused rides don't need a ticking clock.
  const anyRunning = s.scooters.some((sc) => sc.startedAt !== null && sc.pausedAt === null);
  // Tick every second while a ride runs; otherwise just keep the header clock current.
  const now = useNow(true, anyRunning ? 1000 : 15_000);

  const riding = s.scooters.filter((sc) => sc.startedAt !== null).length;
  const pausedCount = s.scooters.filter((sc) => sc.pausedAt !== null).length;
  const overtime = s.scooters.filter(
    (sc) =>
      computeTimerState(sc.startedAt, sc.allocatedMinutes, now, { pausedAt: sc.pausedAt, pausedMs: sc.pausedMs })
        .phase === 'expired',
  ).length;
  const busy = riding > 0 || s.scooters.some((sc) => sc.allocatedMinutes > 0);

  const rows = useMemo(() => toGridRows(s.scooters, columns, false), [s.scooters, columns]);
  const ids = s.scooters.map((sc) => sc.id);
  const allCollapsed = collapse.allCollapsed(ids);
  const editing = s.scooters.find((sc) => sc.id === editingId) ?? null;
  const customScooter = s.scooters.find((sc) => sc.id === customFor) ?? null;

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
        onBack={goHome}
        eyebrow={eyebrow}
        title="Scooters"
        actions={<ThemeToggle />}
      />
      <HeroCard
        label="Riding now"
        value={`${riding}/${s.scooters.length}`}
        caption={
          overtime > 0
            ? `${overtime} in overtime`
            : pausedCount > 0
              ? `${pausedCount} paused`
              : riding > 0
                ? 'on the road'
                : 'all scooters parked'
        }
        colors={gradients.scooters}
        testID="scooters-hero"
      >
        <HeroPill label="Rides today" value={String(s.stats.sessionsToday)} />
        <HeroPill label="Ride time" value={formatMinutes(s.stats.minutesToday)} />
      </HeroCard>
      <SectionHeading title={`Fleet · ${s.scooters.length}`} />
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
        // Room for the floating dock so the last card can scroll above it.
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: dockSpace(insets.bottom) }}
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
                    onPause={s.pause}
                    onResume={s.resume}
                    onCustomMinutes={(sc) => setCustomFor(sc.id)}
                    onReset={resetScooter}
                    onEdit={(sc) => setEditingId(sc.id)}
                  />
                );
              }
              // Spacer keeps the last row's cards the same width as the rest.
              return <View key={cell.kind === 'spacer' ? cell.key : cell.kind} className="flex-1" />;
            })}
          </View>
        )}
      />

      <BottomDock
        actions={[
          { key: 'add', label: 'Scooter', accessibilityLabel: 'Add scooter', icon: 'add', tone: 'scoot', onPress: s.addScooter },
          {
            key: 'collapse',
            label: allCollapsed ? 'Expand' : 'Collapse',
            accessibilityLabel: allCollapsed ? 'Expand all scooters' : 'Collapse all scooters',
            icon: allCollapsed ? 'chevron-expand' : 'chevron-collapse',
            tone: 'neutral',
            onPress: () => collapse.setAll(ids, !allCollapsed),
            disabled: ids.length === 0,
          },
          {
            key: 'reset',
            label: 'Reset day',
            icon: 'refresh',
            tone: 'danger',
            onPress: resetDay,
            disabled: !busy && s.stats.sessionsToday === 0,
          },
        ]}
      />

      <CustomMinutesSheet scooter={customScooter} onClose={() => setCustomFor(null)} onAdd={s.allocate} />
      <ScooterEditSheet
        scooter={editing}
        onClose={() => setEditingId(null)}
        onRename={s.rename}
        onDelete={s.remove}
      />
    </SafeAreaView>
  );
}
