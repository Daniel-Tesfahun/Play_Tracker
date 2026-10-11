import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomMinutesSheet } from '@/components/scooters/CustomMinutesSheet';
import { ScooterCard } from '@/components/scooters/ScooterCard';
import { ScooterEditSheet } from '@/components/scooters/ScooterEditSheet';
import {
  canEnd,
  canPause,
  canReset,
  canResume,
  canStart,
  scooterStatus,
} from '@/components/scooters/scooterStatus';
import { BottomDock, BulkDock, dockSpace, type DockAction } from '@/components/ui/BottomDock';
import { HeroCard, HeroPill } from '@/components/ui/HeroCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SelectRow } from '@/components/ui/SelectRow';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Scooter } from '@/db/types';
import { useClockPrefs } from '@/hooks/useClockPrefs';
import { useCollapsed } from '@/hooks/useCollapsed';
import { useNow } from '@/hooks/useNow';
import { useScooters } from '@/hooks/useScooters';
import { useSelection } from '@/hooks/useSelection';
import { confirmDestructive } from '@/lib/confirm';
import { toGridRows, type GridCell } from '@/lib/grid';
import { goHome } from '@/lib/navigation';
import { PRESET_MINUTES } from '@/lib/timer';
import { formatClock, formatMinutes, formatTimeZoneName } from '@/lib/time';
import { useGradients, usePalette } from '@/theme/usePalette';

type Row = GridCell<Scooter>[];

const rowKey = (row: Row) => row.map((cell) => (cell.kind === 'item' ? cell.item.id : cell.kind)).join('-');

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Start" when it applies to every selected scooter, "Start · 2" when only some. */
const withCount = (label: string, applicable: number, selected: number) =>
  applicable === selected ? label : `${label} · ${applicable}`;

export default function ScootersScreen() {
  const s = useScooters();
  const c = usePalette();
  const gradients = useGradients();
  const insets = useSafeAreaInsets();
  const clock = useClockPrefs();
  const { width } = useWindowDimensions();
  const columns = width >= 640 ? 2 : 1;
  const listRef = useRef<FlashListRef<Row>>(null);
  const collapse = useCollapsed('scooters', () => listRef.current?.prepareForLayoutAnimationRender());
  const select = useSelection(s.scooters);
  const [editingId, setEditingId] = useState<number | null>(null);
  /** Scooters the custom-minutes sheet adds to: one (from a card) or the selection. */
  const [minutesFor, setMinutesFor] = useState<number[] | null>(null);

  // Paused rides don't need a ticking clock.
  const anyRunning = s.scooters.some((sc) => sc.startedAt !== null && sc.pausedAt === null);
  // Tick every second while a ride runs; otherwise just keep the header clock current.
  const now = useNow(true, anyRunning ? 1000 : 15_000);

  const riding = s.scooters.filter((sc) => sc.startedAt !== null).length;
  const pausedCount = s.scooters.filter((sc) => sc.pausedAt !== null).length;
  const overtime = s.scooters.filter((sc) => scooterStatus(sc, now).timer.phase === 'expired').length;
  const busy = riding > 0 || s.scooters.some((sc) => sc.allocatedMinutes > 0);

  const rows = useMemo(() => toGridRows(s.scooters, columns, false), [s.scooters, columns]);
  const ids = s.scooters.map((sc) => sc.id);
  const allCollapsed = collapse.allCollapsed(ids);
  const editing = s.scooters.find((sc) => sc.id === editingId) ?? null;
  const minutesTargets = minutesFor ? s.scooters.filter((sc) => minutesFor.includes(sc.id)) : [];

  const chosen = select.selected;
  const n = chosen.length;
  const idsWhere = (test: (sc: Scooter) => boolean) => chosen.filter(test).map((sc) => sc.id);
  const startIds = idsWhere(canStart);
  const pauseIds = idsWhere(canPause);
  const resumeIds = idsWhere(canResume);
  const endIds = idsWhere(canEnd);
  const resetIds = idsWhere(canReset);

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
      `Cancel ${plural(riding, 'running ride', 'running rides')}, clear booked time, and clear today's ${s.stats.sessionsToday} saved rides?`,
      'Reset day',
      s.resetDay,
    );

  const addMinutes = (targetIds: number[], minutes: number) => {
    if (targetIds.length === 1 && targetIds[0] !== undefined) s.allocate(targetIds[0], minutes);
    else s.allocateMany(targetIds, minutes);
  };

  const bulkEnd = () =>
    confirmDestructive(
      'End rides',
      `End ${plural(endIds.length, 'ride', 'rides')} and save ${endIds.length === 1 ? 'it' : 'them'} to today's rides?`,
      'End rides',
      () => {
        s.stopMany(endIds);
        select.stop();
      },
    );

  const bulkReset = () =>
    confirmDestructive(
      'Reset selected',
      `Cancel rides and booked time on ${plural(resetIds.length, 'scooter', 'scooters')}? Cancelled rides aren't saved.`,
      'Reset',
      () => {
        s.resetMany(resetIds);
        select.stop();
      },
    );

  const bulkDelete = () =>
    confirmDestructive(
      'Delete selected',
      `Remove ${plural(n, 'scooter', 'scooters')} and ${n === 1 ? 'its' : 'their'} ride history?`,
      'Delete',
      () => {
        s.deleteMany(chosen.map((sc) => sc.id));
        select.stop();
      },
    );

  const allChosenIds = chosen.map((sc) => sc.id);
  const bulkActions: DockAction[] = [
    {
      key: 'bulk-start',
      label: withCount('Start', startIds.length, n),
      accessibilityLabel: `Start ${plural(startIds.length, 'ride', 'rides')}`,
      icon: 'play',
      tone: 'go',
      onPress: () => s.startMany(startIds),
      disabled: startIds.length === 0,
    },
    ...PRESET_MINUTES.map(
      (m): DockAction => ({
        key: `bulk-add-${m}`,
        label: `+${formatMinutes(m)}`,
        accessibilityLabel: `Add ${m} minutes to selected scooters`,
        icon: 'time-outline',
        tone: 'scoot',
        onPress: () => s.allocateMany(allChosenIds, m),
      }),
    ),
    {
      key: 'bulk-custom',
      label: 'Time…',
      accessibilityLabel: 'Add a custom number of minutes to selected scooters',
      icon: 'keypad-outline',
      tone: 'neutral',
      onPress: () => setMinutesFor(allChosenIds),
    },
    {
      key: 'bulk-pause',
      label: withCount('Pause', pauseIds.length, n),
      accessibilityLabel: `Pause ${plural(pauseIds.length, 'ride', 'rides')}`,
      icon: 'pause',
      tone: 'neutral',
      onPress: () => s.pauseMany(pauseIds),
      disabled: pauseIds.length === 0,
    },
    {
      key: 'bulk-resume',
      label: withCount('Resume', resumeIds.length, n),
      accessibilityLabel: `Resume ${plural(resumeIds.length, 'ride', 'rides')}`,
      icon: 'play-forward',
      tone: 'neutral',
      onPress: () => s.resumeMany(resumeIds),
      disabled: resumeIds.length === 0,
    },
    {
      key: 'bulk-end',
      label: withCount('End', endIds.length, n),
      accessibilityLabel: `End ${plural(endIds.length, 'ride', 'rides')}`,
      icon: 'stop',
      tone: 'neutral',
      onPress: bulkEnd,
      disabled: endIds.length === 0,
    },
    {
      key: 'bulk-reset',
      label: withCount('Reset', resetIds.length, n),
      accessibilityLabel: `Reset ${plural(resetIds.length, 'scooter', 'scooters')}`,
      icon: 'refresh',
      tone: 'neutral',
      onPress: bulkReset,
      disabled: resetIds.length === 0,
    },
    {
      key: 'bulk-delete',
      label: 'Delete',
      accessibilityLabel: 'Delete selected scooters',
      icon: 'trash-outline',
      tone: 'danger',
      onPress: bulkDelete,
    },
  ];

  const header = (
    <View>
      <ScreenHeader onBack={goHome} eyebrow={eyebrow} title="Scooters" actions={<ThemeToggle />} />
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
      <SectionHeading
        title={`Fleet · ${s.scooters.length}`}
        onSelect={ids.length > 0 ? () => select.start() : undefined}
        selecting={select.active}
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
          if (!first || first.kind !== 'item') return 'spacer';
          if (select.active) return 'select';
          return collapse.isCollapsed(first.item.id) ? 'collapsed' : 'expanded';
        }}
        // Running timers re-render each second; idle lists only on real changes.
        extraData={`${now}-${allCollapsed}-${select.active}-${select.count}`}
        // Room for the floating dock so the last card can scroll above it.
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: dockSpace(insets.bottom, select.active) }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        renderItem={({ item: row }) => (
          <View className="flex-row gap-3">
            {row.map((cell) => {
              if (cell.kind === 'item') {
                const sc = cell.item;
                if (select.active) {
                  const status = scooterStatus(sc, now);
                  return (
                    <SelectRow
                      key={sc.id}
                      id={sc.id}
                      title={sc.name}
                      subtitle={status.style.label}
                      selected={select.isSelected(sc.id)}
                      onToggle={select.toggle}
                      tone="scoot"
                      testID={`select-scooter-${sc.id}`}
                      trailing={
                        <Text
                          className={`text-xl font-extrabold ${sc.startedAt !== null ? 'text-ink' : 'text-muted'}`}
                          style={[
                            { fontVariant: ['tabular-nums'] },
                            status.timer.phase === 'expired' && !status.timer.paused ? { color: c.danger } : null,
                          ]}
                        >
                          {status.time}
                        </Text>
                      }
                    />
                  );
                }
                return (
                  <ScooterCard
                    key={sc.id}
                    scooter={sc}
                    now={now}
                    clock={clock}
                    collapsed={collapse.isCollapsed(sc.id)}
                    onToggleCollapse={collapse.toggle}
                    onLongPressSelect={select.start}
                    onAllocate={s.allocate}
                    onClearAllocation={s.clearAllocation}
                    onStart={s.start}
                    onStop={s.stop}
                    onPause={s.pause}
                    onResume={s.resume}
                    onCustomMinutes={(target) => setMinutesFor([target.id])}
                    onReset={resetScooter}
                    onEdit={(target) => setEditingId(target.id)}
                  />
                );
              }
              // Spacer keeps the last row's cards the same width as the rest.
              return <View key={cell.kind === 'spacer' ? cell.key : cell.kind} className="flex-1" />;
            })}
          </View>
        )}
      />

      {select.active ? (
        <BulkDock
          count={select.count}
          noun={['scooter', 'scooters']}
          allSelected={select.allSelected}
          onToggleAll={select.toggleAll}
          onDone={select.stop}
          actions={bulkActions}
        />
      ) : (
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
      )}

      <CustomMinutesSheet scooters={minutesTargets} onClose={() => setMinutesFor(null)} onAdd={addMinutes} />
      <ScooterEditSheet scooter={editing} onClose={() => setEditingId(null)} onRename={s.rename} onDelete={s.remove} />
    </SafeAreaView>
  );
}
