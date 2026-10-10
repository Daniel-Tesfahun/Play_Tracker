import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Zone } from '@/db/types';
import palette from '@/theme/palette';

interface ZoneEditSheetProps {
  zone: Zone | null;
  onClose: () => void;
  onSave: (zoneId: number, details: { name: string; currentGame: string | null }) => void;
  onUndo: (zoneId: number) => void;
  onReset: (zoneId: number) => void;
  onDelete: (zoneId: number) => void;
  loadBreakdown: (zoneId: number) => Promise<{ title: string; plays: number }[]>;
}

export function ZoneEditSheet({ zone, ...rest }: ZoneEditSheetProps) {
  if (!zone) return null;
  // Keyed so the form fields start from this zone's saved values each time it opens.
  return <ZoneEditForm key={zone.id} zone={zone} {...rest} />;
}

function ZoneEditForm({
  zone,
  onClose,
  onSave,
  onUndo,
  onReset,
  onDelete,
  loadBreakdown,
}: ZoneEditSheetProps & { zone: Zone }) {
  const [name, setName] = useState(zone.name);
  const [game, setGame] = useState(zone.currentGame ?? '');
  const [breakdown, setBreakdown] = useState<{ title: string; plays: number }[]>([]);

  const { id, gamesToday } = zone;
  useEffect(() => {
    let cancelled = false;
    void loadBreakdown(id).then((rows) => {
      if (!cancelled) setBreakdown(rows);
    });
    return () => {
      cancelled = true;
    };
    // gamesToday is a trigger: reload the breakdown after undo/reset.
  }, [id, gamesToday, loadBreakdown]);

  const confirm = (title: string, message: string, action: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: 'destructive', onPress: action },
    ]);

  return (
    <Sheet visible title={zone.name} onClose={onClose}>
      <Field label="Section name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Zone name"
          placeholderTextColor={palette.faint}
          className={inputClassName}
          maxLength={32}
        />
      </Field>
      <Field label="Game being played">
        <TextInput
          value={game}
          onChangeText={setGame}
          placeholder="e.g. EA FC 26"
          placeholderTextColor={palette.faint}
          className={inputClassName}
          maxLength={48}
          returnKeyType="done"
        />
      </Field>

      {breakdown.length > 0 ? (
        <View className="mb-4 rounded-xl border border-line bg-elevated px-4 py-3">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-faint">
            Today · {zone.gamesToday} games
          </Text>
          {breakdown.map((row) => (
            <View key={row.title} className="flex-row justify-between py-1">
              <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
                {row.title}
              </Text>
              <Text className="text-sm font-semibold text-ink">{row.plays}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mb-3 flex-row gap-3">
        <Button
          label="Undo last"
          icon="arrow-undo"
          onPress={() => onUndo(zone.id)}
          disabled={zone.gamesToday === 0}
          className="flex-1"
        />
        <Button
          label="Reset today"
          icon="refresh"
          onPress={() =>
            confirm('Reset', `Clear today's ${zone.gamesToday} games on ${zone.name}?`, () =>
              onReset(zone.id),
            )
          }
          disabled={zone.gamesToday === 0}
          className="flex-1"
        />
      </View>
      <Button
        label="Save"
        variant="primary"
        disabled={name.trim().length === 0}
        onPress={() => {
          onSave(zone.id, { name, currentGame: game });
          onClose();
        }}
        className="mb-3"
      />
      <Button
        label="Delete section"
        variant="danger"
        icon="trash-outline"
        onPress={() =>
          confirm('Delete', `Remove ${zone.name} and its history?`, () => {
            onDelete(zone.id);
            onClose();
          })
        }
      />
    </Sheet>
  );
}
