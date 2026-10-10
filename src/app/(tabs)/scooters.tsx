import { useMemo, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScooterCard } from '@/components/scooters/ScooterCard';
import { ScooterEditSheet } from '@/components/scooters/ScooterEditSheet';
import { AddTile } from '@/components/ui/AddTile';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatTile } from '@/components/ui/StatTile';
import { useNow } from '@/hooks/useNow';
import { useScooters } from '@/hooks/useScooters';
import { toGridRows } from '@/lib/grid';
import { computeTimerState } from '@/lib/timer';
import { formatMinutes } from '@/lib/time';
import palette from '@/theme/palette';

export default function ScootersScreen() {
  const s = useScooters();
  const { width } = useWindowDimensions();
  const columns = width >= 640 ? 2 : 1;
  const [editingId, setEditingId] = useState<number | null>(null);

  const anyRunning = s.scooters.some((sc) => sc.startedAt !== null);
  // Only tick once a second while something is actually running.
  const now = useNow(anyRunning);

  const riding = s.scooters.filter((sc) => sc.startedAt !== null).length;
  const overtime = s.scooters.filter(
    (sc) => computeTimerState(sc.startedAt, sc.allocatedMinutes, now).phase === 'expired',
  ).length;

  const rows = useMemo(() => toGridRows(s.scooters, columns), [s.scooters, columns]);
  const editing = s.scooters.find((sc) => sc.id === editingId) ?? null;

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
              eyebrow="Rentals"
              title="Scooters"
              action={
                <IconButton
                  icon="add"
                  label="Add scooter"
                  variant="filled"
                  color={palette.ink}
                  onPress={() => void s.addScooter()}
                />
              }
            />
            <View className="mb-4 flex-row gap-3">
              <StatTile
                label="Riding"
                value={`${riding}/${s.scooters.length}`}
                tone={riding > 0 ? 'text-neon' : 'text-ink'}
                caption={overtime > 0 ? `${overtime} in overtime` : 'on the road'}
              />
              <StatTile label="Rides" value={String(s.stats.sessionsToday)} caption="completed today" />
              <StatTile
                label="Ride time"
                value={formatMinutes(s.stats.minutesToday)}
                caption="billed today"
              />
            </View>
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
                    onAllocate={(id, m) => void s.allocate(id, m)}
                    onClearAllocation={(id) => void s.clearAllocation(id)}
                    onStart={(id) => void s.start(id)}
                    onStop={(id) => void s.stop(id)}
                    onEdit={(sc) => setEditingId(sc.id)}
                  />
                );
              }
              if (cell.kind === 'add') {
                return (
                  <AddTile
                    key="add"
                    label="Add scooter"
                    minHeight={96}
                    onPress={() => void s.addScooter()}
                  />
                );
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
