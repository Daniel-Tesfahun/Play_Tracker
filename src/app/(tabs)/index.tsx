import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoneCard } from '@/components/gaming/ZoneCard';
import { ZoneEditSheet } from '@/components/gaming/ZoneEditSheet';
import { AddTile } from '@/components/ui/AddTile';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatTile } from '@/components/ui/StatTile';
import { useGridColumns } from '@/hooks/useGridColumns';
import { useZones } from '@/hooks/useZones';
import { summarizeZones, zoneShare } from '@/lib/gaming';
import { toGridRows } from '@/lib/grid';
import palette from '@/theme/palette';

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

export default function GamingZonesScreen() {
  const z = useZones();
  const columns = useGridColumns();
  const [editingId, setEditingId] = useState<number | null>(null);

  const summary = useMemo(() => summarizeZones(z.zones), [z.zones]);
  const rows = useMemo(() => toGridRows(z.zones, columns), [z.zones, columns]);
  // Read the live zone so the sheet reflects undo/reset immediately.
  const editing = z.zones.find((zone) => zone.id === editingId) ?? null;

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
              action={
                <IconButton
                  icon="add"
                  label="Add section"
                  variant="filled"
                  color={palette.ink}
                  onPress={() => void z.addZone()}
                />
              }
            />
            <View className="mb-4 flex-row gap-3">
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
                    onEdit={(zone) => setEditingId(zone.id)}
                  />
                );
              }
              if (cell.kind === 'add') {
                return <AddTile key="add" label="Add section" onPress={() => void z.addZone()} />;
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
        onUndo={z.decrement}
        onReset={(id) => void z.resetToday(id)}
        onDelete={(id) => void z.deleteZone(id)}
        loadBreakdown={z.titleBreakdown}
      />
    </SafeAreaView>
  );
}
