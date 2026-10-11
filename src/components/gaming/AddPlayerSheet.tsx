import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Zone } from '@/db/types';
import { MAX_PLAYERS_PER_ZONE } from '@/db/zonesRepo';
import { usePalette } from '@/theme/usePalette';

interface AddPlayerSheetProps {
  zone: Zone | null;
  onClose: () => void;
  onAdd: (zoneId: number, name: string) => void;
}

export function AddPlayerSheet({ zone, ...rest }: AddPlayerSheetProps) {
  if (!zone) return null;
  return <AddPlayerForm key={zone.id} zone={zone} {...rest} />;
}

function AddPlayerForm({ zone, onClose, onAdd }: AddPlayerSheetProps & { zone: Zone }) {
  const c = usePalette();
  const [name, setName] = useState('');
  const full = zone.players.length >= MAX_PLAYERS_PER_ZONE;
  const valid = name.trim().length > 0 && !full;

  // Stay open after adding so several players can be entered in a row.
  const submit = () => {
    if (!valid) return;
    onAdd(zone.id, name);
    setName('');
  };

  return (
    <Sheet visible title={`Players · ${zone.name}`} onClose={onClose}>
      <Field label="Player name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Abel"
          placeholderTextColor={c.faint}
          className={inputClassName}
          maxLength={24}
          autoFocus
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={submit}
          testID="player-name-input"
        />
      </Field>
      {zone.players.length > 0 ? (
        <View className="mb-4 flex-row flex-wrap gap-2">
          {zone.players.map((p) => (
            <View key={p.id} className="rounded-full border border-line bg-elevated px-3 py-1.5">
              <Text className="text-sm font-semibold text-ink">{p.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {full ? (
        <Text className="mb-3 text-xs font-semibold text-amber">Max {MAX_PLAYERS_PER_ZONE} players per station.</Text>
      ) : null}
      <Button label="Add player" variant="brand" icon="person-add" disabled={!valid} onPress={submit} className="mb-3" />
      <Button label="Done" onPress={onClose} />
    </Sheet>
  );
}
