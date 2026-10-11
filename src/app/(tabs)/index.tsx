import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddPlayerSheet } from '@/components/gaming/AddPlayerSheet';
import { ZoneCard } from '@/components/gaming/ZoneCard';
import { ZoneEditSheet } from '@/components/gaming/ZoneEditSheet';
import { AddTile } from '@/components/ui/AddTile';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionToolbar } from '@/components/ui/SectionToolbar';
import { StatTile } from '@/components/ui/StatTile';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Zone } from '@/db/types';
import { useGridColumns } from '@/hooks/useGridColumns';
import { useZones } from '@/hooks/useZones';
import { confirmDestructive } from '@/lib/confirm';
import { summarizeZones, zoneShare } from '@/lib/gaming';
import { toGridRows } from '@/lib/grid';
import { usePalette } from '@/theme/usePalette';

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

export default function GamingZonesScreen() {
  const z = useZones();
  const c = usePalette();
  const columns = useGridColumns();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingPlayerTo, setAddingPlayerTo] = useState<number | null>(null);

  const summary = useMemo(() => summarizeZones(z.zones), [z.zones]);
  const rows = useMemo(() => toGridRows(z.zones, columns), [z.zones, columns]);
  // Read live zones so open sheets reflect undo/reset/new players immediately.
  const editing = z.zones.find((zone) => zone.id === editingId) ?? null;
  const addingPlayer = z.zones.find((zone) => zone.id === addingPlayerTo) ?? null;

  const resetZone = (zone: Zone) => {
    if (zone.gamesToday === 0) return;
    confirmDestructive('Reset zone', `Clear today's ${zone.gamesToday} games on ${zone.name}?`, 'Reset', () => {
      void z.resetToday(zone.id);
    });
  };

  const resetDay = () =>
    confirmDestructive(
      'Reset day',
      `Clear all ${summary.totalGames} games logged today on every zone? Players and zones are kept.`,
      'Reset day',
      () => void z.resetAllToday(),
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <FlatList
        data={rows}
        key={columns}
        keyExtractor={(_, i) => `row-${i}`}
        contentContainerClassName="px-4 pb-8"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              eyebrow={todayLabel()}
              title="Gaming Zones"
              actions={
                <>
                  <ThemeToggle />
                  <IconButton
                    icon="add"
                    label="Add section"
                    variant="filled"
                    color={c.ink}
                    onPress={() => void z.addZone()}
                  />
                </>
              }
            />
            <View className="flex-row gap-3">
              <StatTile label="Games today" value={String(summary.totalGames)} tone="text-neon" />
              <StatTile
                label="Active"
                value={`${summary.activeZones}/${summary.zoneCount}`}
                caption="sections played"
              />
              <StatTile
                label="Top section"
                value={summary.topZone ? String(summary.topZone.gamesToday) : '—'}
                caption={summary.topZone?.name ?? 'No games yet'}
              />
            </View>
            <SectionToolbar
              title={`Sections · ${summary.zoneCount}`}
              resetLabel="Reset day"
              onReset={resetDay}
              resetDisabled={summary.totalGames === 0}
              testID="zones-reset-day"
            />
          </View>
        }
        renderItem={({ item: row }) => (
          <View className="flex-row gap-3">
            {row.map((cell) => {
              if (cell.kind === 'item') {
                return (
                  <ZoneCard
                    key={cell.item.id}
                    zone={cell.item}
                    share={zoneShare(cell.item, summary.totalGames)}
                    onIncrement={z.increment}
                    onDecrementPlayer={z.decrementPlayer}
                    onUndo={(id) => void z.undoLast(id)}
                    onReset={resetZone}
                    onAddPlayer={(zone) => setAddingPlayerTo(zone.id)}
                    onEdit={(zone) => setEditingId(zone.id)}
                  />
                );
              }
              if (cell.kind === 'add') {
                return (
                  <AddTile
                    key="add"
                    label="Add section"
                    minHeight={columns === 1 ? 96 : 168}
                    onPress={() => void z.addZone()}
                  />
                );
              }
              return <View key={cell.key} className="flex-1" />;
            })}
          </View>
        )}
      />

      <ZoneEditSheet
        zone={editing}
        onClose={() => setEditingId(null)}
        onSave={(id, details) => void z.updateZone(id, details)}
        onUndo={(id) => void z.undoLast(id)}
        onReset={(id) => void z.resetToday(id)}
        onDelete={(id) => void z.deleteZone(id)}
        onAddPlayer={(zone) => {
          setEditingId(null);
          setAddingPlayerTo(zone.id);
        }}
        onRenamePlayer={(id, name) => void z.renamePlayer(id, name)}
        onRemovePlayer={(id) => void z.removePlayer(id)}
        loadBreakdown={z.titleBreakdown}
      />
      <AddPlayerSheet
        zone={addingPlayer}
        onClose={() => setAddingPlayerTo(null)}
        onAdd={(zoneId, name) => void z.addPlayer(zoneId, name)}
      />
    </SafeAreaView>
  );
}
