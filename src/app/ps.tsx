import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddPlayerSheet } from '@/components/gaming/AddPlayerSheet';
import { ZoneCard } from '@/components/gaming/ZoneCard';
import { ZoneEditSheet } from '@/components/gaming/ZoneEditSheet';
import { HeroCard, HeroPill } from '@/components/ui/HeroCard';
import { BottomDock, dockSpace } from '@/components/ui/BottomDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Zone } from '@/db/types';
import { useCollapsed } from '@/hooks/useCollapsed';
import { useGridColumns } from '@/hooks/useGridColumns';
import { useZones } from '@/hooks/useZones';
import { confirmDestructive } from '@/lib/confirm';
import { goHome } from '@/lib/navigation';
import { summarizeZones, zoneShare } from '@/lib/gaming';
import { toGridRows, type GridCell } from '@/lib/grid';
import { useGradients } from '@/theme/usePalette';

type Row = GridCell<Zone>[];

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

const rowKey = (row: Row) => row.map((cell) => (cell.kind === 'item' ? cell.item.id : cell.kind)).join('-');

export default function PsScreen() {
  const z = useZones();
  const gradients = useGradients();
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();
  const listRef = useRef<FlashListRef<Row>>(null);
  const collapse = useCollapsed('zones', () => listRef.current?.prepareForLayoutAnimationRender());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingPlayerTo, setAddingPlayerTo] = useState<number | null>(null);

  const summary = useMemo(() => summarizeZones(z.zones), [z.zones]);
  const rows = useMemo(() => toGridRows(z.zones, columns, false), [z.zones, columns]);
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
        onBack={goHome}
        eyebrow={todayLabel()}
        title="PS"
        actions={<ThemeToggle />}
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
      <SectionHeading title={`Stations · ${summary.zoneCount}`} />
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
        // Room for the floating dock so the last card can scroll above it.
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: dockSpace(insets.bottom) }}
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
              // Spacer keeps the last row's cards the same width as the rest.
              return <View key={cell.kind === 'spacer' ? cell.key : cell.kind} className="flex-1" />;
            })}
          </View>
        )}
      />

      <BottomDock
        actions={[
          { key: 'add', label: 'Station', accessibilityLabel: 'Add station', icon: 'add', tone: 'brand', onPress: z.addZone },
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
