import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddPlayerSheet } from '@/components/gaming/AddPlayerSheet';
import { ZoneCard } from '@/components/gaming/ZoneCard';
import { ZoneEditSheet } from '@/components/gaming/ZoneEditSheet';
import { AddTile } from '@/components/ui/AddTile';
import { HeroCard, HeroPill } from '@/components/ui/HeroCard';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionToolbar } from '@/components/ui/SectionToolbar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Zone } from '@/db/types';
import { useCollapsed } from '@/hooks/useCollapsed';
import { useGridColumns } from '@/hooks/useGridColumns';
import { useZones } from '@/hooks/useZones';
import { confirmDestructive } from '@/lib/confirm';
import { summarizeZones, zoneShare } from '@/lib/gaming';
import { toGridRows, type GridCell } from '@/lib/grid';
import { useGradients, usePalette } from '@/theme/usePalette';

type Row = GridCell<Zone>[];

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

const rowKey = (row: Row) => row.map((cell) => (cell.kind === 'item' ? cell.item.id : cell.kind)).join('-');

export default function PsScreen() {
  const z = useZones();
  const c = usePalette();
  const gradients = useGradients();
  const columns = useGridColumns();
  const listRef = useRef<FlashListRef<Row>>(null);
  const collapse = useCollapsed('zones', () => listRef.current?.prepareForLayoutAnimationRender());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingPlayerTo, setAddingPlayerTo] = useState<number | null>(null);

  const summary = useMemo(() => summarizeZones(z.zones), [z.zones]);
  const rows = useMemo(() => toGridRows(z.zones, columns), [z.zones, columns]);
  const ids = z.zones.map((zone) => zone.id);
  const allCollapsed = collapse.allCollapsed(ids);
  // Read live zones so open sheets reflect undo/reset/new players immediately.
  const editing = z.zones.find((zone) => zone.id === editingId) ?? null;
  const addingPlayer = z.zones.find((zone) => zone.id === addingPlayerTo) ?? null;

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

  const header = (
    <View>
      <ScreenHeader
        eyebrow={todayLabel()}
        title="PS"
        actions={
          <>
            <ThemeToggle />
            <IconButton icon="add" label="Add station" variant="filled" color={c.ink} onPress={z.addZone} />
          </>
        }
      />
      <HeroCard
        label="Games today"
        value={String(summary.totalGames)}
        caption={`across ${summary.zoneCount} ${summary.zoneCount === 1 ? 'station' : 'stations'}`}
        colors={gradients.zones}
        testID="zones-hero"
      >
        <HeroPill label="Active" value={`${summary.activeZones}/${summary.zoneCount}`} />
        <HeroPill
          label="Top station"
          value={summary.topZone ? `${summary.topZone.name} · ${summary.topZone.gamesToday}` : '—'}
        />
      </HeroCard>
      <SectionToolbar
        title={`Stations · ${summary.zoneCount}`}
        resetLabel="Reset day"
        onReset={resetDay}
        resetDisabled={summary.totalGames === 0}
        allCollapsed={allCollapsed}
        onToggleAll={() => collapse.setAll(ids, !allCollapsed)}
        testID="zones-reset-day"
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
        extraData={allCollapsed}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        renderItem={({ item: row }) => (
          <View className="flex-row gap-3">
            {row.map((cell) => {
              if (cell.kind === 'item') {
                return (
                  <ZoneCard
                    key={cell.item.id}
                    zone={cell.item}
                    share={zoneShare(cell.item, summary.totalGames)}
                    collapsed={collapse.isCollapsed(cell.item.id)}
                    onToggleCollapse={collapse.toggle}
                    onIncrement={z.increment}
                    onDecrementPlayer={z.decrementPlayer}
                    onUndo={z.undoLast}
                    onReset={resetZone}
                    onAddPlayer={(zone) => setAddingPlayerTo(zone.id)}
                    onEdit={(zone) => setEditingId(zone.id)}
                  />
                );
              }
              if (cell.kind === 'add') {
                return <AddTile key="add" label="Add station" minHeight={columns === 1 ? 88 : 168} onPress={z.addZone} />;
              }
              return <View key={cell.key} className="flex-1" />;
            })}
          </View>
        )}
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
