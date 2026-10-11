import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Player, Zone } from '@/db/types';
import { confirmDestructive } from '@/lib/confirm';
import { usePalette } from '@/theme/usePalette';

interface ZoneEditSheetProps {
  zone: Zone | null;
  onClose: () => void;
  onSave: (zoneId: number, details: { name: string; currentGame: string | null }) => void;
  onUndo: (zoneId: number) => void;
  onReset: (zoneId: number) => void;
  onDelete: (zoneId: number) => void;
  onAddPlayer: (zone: Zone) => void;
  onRenamePlayer: (playerId: number, name: string) => void;
  onRemovePlayer: (playerId: number) => void;
  loadBreakdown: (zoneId: number) => Promise<{ title: string; plays: number }[]>;
}

export function ZoneEditSheet({ zone, ...rest }: ZoneEditSheetProps) {
  if (!zone) return null;
  // Keyed so the form fields start from this zone's saved values each time it opens.
  return <ZoneEditForm key={zone.id} zone={zone} {...rest} />;
}

function PlayerEditRow({
  player,
  onRename,
  onRemove,
}: {
  player: Player;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const c = usePalette();
  const [name, setName] = useState(player.name);

  return (
    <View className="mb-2 flex-row items-center gap-2">
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== player.name) onRename(trimmed);
          else setName(player.name);
        }}
        placeholderTextColor={c.faint}
        className={`flex-1 ${inputClassName}`}
        maxLength={24}
        accessibilityLabel={`Rename ${player.name}`}
      />
      <Text className="w-16 text-right text-xs text-muted">{player.gamesToday} today</Text>
      <IconButton
        icon="trash-outline"
        label={`Remove ${player.name}`}
        color={c.danger}
        onPress={() =>
          confirmDestructive(
            'Remove player',
            `Remove ${player.name}? Their games today stay on the zone total.`,
            'Remove',
            onRemove,
          )
        }
      />
    </View>
  );
}

function ZoneEditForm({
  zone,
  onClose,
  onSave,
  onUndo,
  onReset,
  onDelete,
  onAddPlayer,
  onRenamePlayer,
  onRemovePlayer,
  loadBreakdown,
}: ZoneEditSheetProps & { zone: Zone }) {
  const c = usePalette();
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

  return (
    <Sheet visible title={zone.name} onClose={onClose}>
      <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
        <Field label="Section name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Zone name"
            placeholderTextColor={c.faint}
            className={inputClassName}
            maxLength={32}
          />
        </Field>
        <Field label="Game being played">
          <TextInput
            value={game}
            onChangeText={setGame}
            placeholder="e.g. EA FC 26"
            placeholderTextColor={c.faint}
            className={inputClassName}
            maxLength={48}
            returnKeyType="done"
          />
        </Field>

        <Field label={`Players · ${zone.players.length}`}>
          {zone.players.map((p) => (
            <PlayerEditRow
              key={p.id}
              player={p}
              onRename={(n) => onRenamePlayer(p.id, n)}
              onRemove={() => onRemovePlayer(p.id)}
            />
          ))}
          <Button label="Add player" icon="person-add-outline" onPress={() => onAddPlayer(zone)} />
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
              confirmDestructive('Reset zone', `Clear today's ${zone.gamesToday} games on ${zone.name}?`, 'Reset', () =>
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
            confirmDestructive('Delete section', `Remove ${zone.name}, its players, and its history?`, 'Delete', () => {
              onDelete(zone.id);
              onClose();
            })
          }
        />
      </ScrollView>
    </Sheet>
  );
}
