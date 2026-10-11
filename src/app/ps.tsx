import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddPlayerSheet } from '@/components/gaming/AddPlayerSheet';
import { SetGameSheet } from '@/components/gaming/SetGameSheet';
import { ZoneCard } from '@/components/gaming/ZoneCard';
import { ZoneEditSheet } from '@/components/gaming/ZoneEditSheet';
import { BottomDock, BulkDock, dockSpace } from '@/components/ui/BottomDock';
import { HeroCard, HeroPill } from '@/components/ui/HeroCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SelectRow } from '@/components/ui/SelectRow';
import { SwipeRow } from '@/components/ui/SwipeRow';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Zone } from '@/db/types';
import { useCollapsed } from '@/hooks/useCollapsed';
import { useGridColumns } from '@/hooks/useGridColumns';
import { useSelection } from '@/hooks/useSelection';
import { useZones } from '@/hooks/useZones';
import { confirmDestructive } from '@/lib/confirm';
import { summarizeZones, zoneShare } from '@/lib/gaming';
import { toGridRows, type GridCell } from '@/lib/grid';
import { goHome } from '@/lib/navigation';
import { useGradients } from '@/theme/usePalette';

type Row = GridCell<Zone>[];

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

const rowKey = (row: Row) => row.map((cell) => (cell.kind === 'item' ? cell.item.id : cell.kind)).join('-');

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function PsScreen() {
  const z = useZones();
  const gradients = useGradients();
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();
  const listRef = useRef<FlashListRef<Row>>(null);
  const collapse = useCollapsed('zones', () => listRef.current?.prepareForLayoutAnimationRender());
  const select = useSelection(z.zones);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingPlayerTo, setAddingPlayerTo] = useState<number | null>(null);
  const [settingGame, setSettingGame] = useState(false);

  const summary = useMemo(() => summarizeZones(z.zones), [z.zones]);
  const rows = useMemo(() => toGridRows(z.zones, columns, false), [z.zones, columns]);
  const ids = z.zones.map((zone) => zone.id);
  const allCollapsed = collapse.allCollapsed(ids);
  // Read live zones so open sheets reflect undo/reset/new players immediately.
  const editing = z.zones.find((zone) => zone.id === editingId) ?? null;
  const addingPlayer = z.zones.find((zone) => zone.id === addingPlayerTo) ?? null;

  const chosen = select.selected;
  const chosenIds = chosen.map((zone) => zone.id);
  const chosenGames = chosen.reduce((sum, zone) => sum + zone.gamesToday, 0);

  const resetZone = (zone: Zone) => {
    if (zone.gamesToday === 0) return;
    confirmDestructive('Reset station', `Clear today's ${zone.gamesToday} games on ${zone.name}?`, 'Reset', () =>
      z.resetToday(zone.id),
    );
  };

  const resetDay = () =>
    confirmDestructive(
      'Reset day',
      `Clear all ${summary.totalGames} games logged today on every station? Players and stations are kept.`,
      'Reset day',
      z.resetAllToday,
    );

  const deleteZone = (zone: Zone) =>
    confirmDestructive('Delete station', `Remove ${zone.name}, its players, and its history?`, 'Delete', () =>
      z.deleteZone(zone.id),
    );

  const bulkReset = () =>
    confirmDestructive(
      'Reset selected',
      `Clear today's ${plural(chosenGames, 'game', 'games')} on ${plural(chosen.length, 'station', 'stations')}?`,
      'Reset',
      () => {
        z.resetMany(chosenIds);
        select.stop();
      },
    );

  const bulkDelete = () =>
    confirmDestructive(
      'Delete selected',
      `Remove ${plural(chosen.length, 'station', 'stations')}, their players, and their history?`,
      'Delete',
      () => {
        z.deleteMany(chosenIds);
        select.stop();
      },
    );

  const header = (
    <View>
      <ScreenHeader onBack={goHome} eyebrow={todayLabel()} title="PS" actions={<ThemeToggle />} />
      <HeroCard
        label="Games today"
        value={String(summary.totalGames)}
        caption={`across ${plural(summary.zoneCount, 'station', 'stations')}`}
        colors={gradients.zones}
        testID="zones-hero"
      >
        <HeroPill label="Active" value={`${summary.activeZones}/${summary.zoneCount}`} />
        <HeroPill
          label="Top station"
          value={summary.topZone ? `${summary.topZone.name} · ${summary.topZone.gamesToday}` : '—'}
        />
      </HeroCard>
      <SectionHeading
        title={`Stations · ${summary.zoneCount}`}
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
        extraData={`${allCollapsed}-${select.active}-${select.count}`}
        // Room for the floating dock so the last card can scroll above it.
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: dockSpace(insets.bottom, select.active) }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        renderItem={({ item: row }) => (
          <View className="flex-row gap-3">
            {row.map((cell) => {
              if (cell.kind === 'item') {
                const zone = cell.item;
                if (select.active) {
                  return (
                    <SelectRow
                      key={zone.id}
                      id={zone.id}
                      title={zone.name}
                      subtitle={zone.currentGame ?? 'No game set'}
                      selected={select.isSelected(zone.id)}
                      onToggle={select.toggle}
                      tone="brand"
                      testID={`select-zone-${zone.id}`}
                      trailing={
                        <Text className="text-2xl font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
                          {zone.gamesToday}
                        </Text>
                      }
                    />
                  );
                }
                return (
                  <SwipeRow
                    key={zone.id}
                    testID={`swipe-zone-${zone.id}`}
                    left={{
                      label: 'Delete',
                      icon: 'trash-outline',
                      fill: 'danger',
                      ink: 'canvas',
                      onPress: () => deleteZone(zone),
                    }}
                    right={{
                      label: 'Edit',
                      icon: 'create-outline',
                      fill: 'brand',
                      ink: 'onAccent',
                      onPress: () => setEditingId(zone.id),
                    }}
                  >
                    <ZoneCard
                      key={zone.id}
                      zone={zone}
                      share={zoneShare(zone, summary.totalGames)}
                      collapsed={collapse.isCollapsed(zone.id)}
                      onToggleCollapse={collapse.toggle}
                      onLongPressSelect={select.start}
                      onIncrement={z.increment}
                      onDecrementPlayer={z.decrementPlayer}
                      onUndo={z.undoLast}
                      onReset={resetZone}
                      onAddPlayer={(zn) => setAddingPlayerTo(zn.id)}
                      onEdit={(zn) => setEditingId(zn.id)}
                    />
                  </SwipeRow>
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
          noun={['station', 'stations']}
          allSelected={select.allSelected}
          onToggleAll={select.toggleAll}
          onDone={select.stop}
          actions={[
            {
              key: 'bulk-game',
              label: 'Set game',
              accessibilityLabel: 'Set game on selected stations',
              icon: 'disc-outline',
              tone: 'brand',
              onPress: () => setSettingGame(true),
            },
            {
              key: 'bulk-reset',
              label: 'Reset today',
              accessibilityLabel: 'Reset today on selected stations',
              icon: 'refresh',
              tone: 'neutral',
              onPress: bulkReset,
              disabled: chosenGames === 0,
            },
            {
              key: 'bulk-delete',
              label: 'Delete',
              accessibilityLabel: 'Delete selected stations',
              icon: 'trash-outline',
              tone: 'danger',
              onPress: bulkDelete,
            },
          ]}
        />
      ) : (
        <BottomDock
          actions={[
            {
              key: 'add',
              label: 'Station',
              accessibilityLabel: 'Add station',
              icon: 'add',
              tone: 'brand',
              onPress: z.addZone,
            },
            {
              key: 'collapse',
              label: allCollapsed ? 'Expand' : 'Collapse',
              accessibilityLabel: allCollapsed ? 'Expand all stations' : 'Collapse all stations',
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
              disabled: summary.totalGames === 0,
            },
          ]}
        />
      )}

      <SetGameSheet
        zones={chosen}
        visible={settingGame}
        onClose={() => setSettingGame(false)}
        onSave={(game) => z.setGameMany(chosenIds, game)}
      />
      <ZoneEditSheet
        zone={editing}
        onClose={() => setEditingId(null)}
        onSave={z.updateZone}
        onUndo={z.undoLast}
        onReset={z.resetToday}
        onDelete={z.deleteZone}
        onAddPlayer={(zone) => {
          setEditingId(null);
          setAddingPlayerTo(zone.id);
        }}
        onRenamePlayer={z.renamePlayer}
        onRemovePlayer={z.removePlayer}
        loadBreakdown={z.titleBreakdown}
      />
      <AddPlayerSheet zone={addingPlayer} onClose={() => setAddingPlayerTo(null)} onAdd={z.addPlayer} />
    </SafeAreaView>
  );
}
