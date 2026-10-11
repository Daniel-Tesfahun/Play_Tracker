import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Zone } from '@/db/types';
import { usePalette } from '@/theme/usePalette';

interface SetGameSheetProps {
  /** Stations to update; the sheet is hidden when empty. */
  zones: Zone[];
  visible: boolean;
  onClose: () => void;
  onSave: (game: string | null) => void;
}

/** Sets the same "game being played" on several stations at once (bulk action). */
export function SetGameSheet({ zones, visible, onClose, onSave }: SetGameSheetProps) {
  if (!visible || zones.length === 0) return null;
  return <SetGameForm zones={zones} onClose={onClose} onSave={onSave} />;
}

function SetGameForm({ zones, onClose, onSave }: Omit<SetGameSheetProps, 'visible'>) {
  const c = usePalette();
  // Pre-fill when every selected station already shows the same game.
  const shared = zones.every((z) => z.currentGame === zones[0]?.currentGame) ? (zones[0]?.currentGame ?? '') : '';
  const [game, setGame] = useState(shared);
  const n = zones.length;

  return (
    <Sheet visible title={`Set game · ${n} ${n === 1 ? 'station' : 'stations'}`} onClose={onClose}>
      <Field label="Game being played">
        <TextInput
          value={game}
          onChangeText={setGame}
          placeholder="e.g. EA FC 26"
          placeholderTextColor={c.faint}
          className={inputClassName}
          maxLength={48}
          autoFocus
          returnKeyType="done"
          testID="bulk-game-input"
        />
      </Field>
      <Text className="mb-4 text-sm font-medium text-muted" numberOfLines={2}>
        {zones.map((z) => z.name).join(', ')}
      </Text>
      <Button
        label={game.trim() ? `Set on ${n} ${n === 1 ? 'station' : 'stations'}` : 'Clear game title'}
        variant="brand"
        icon="disc-outline"
        onPress={() => {
          onSave(game.trim() || null);
          onClose();
        }}
        testID="bulk-game-save"
        className="mb-3"
      />
      <Button label="Cancel" onPress={onClose} />
    </Sheet>
  );
}
