import { useState } from 'react';
import { Alert, TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Scooter } from '@/db/types';
import { usePalette } from '@/theme/usePalette';

interface ScooterEditSheetProps {
  scooter: Scooter | null;
  onClose: () => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

export function ScooterEditSheet({ scooter, ...rest }: ScooterEditSheetProps) {
  if (!scooter) return null;
  return <ScooterEditForm key={scooter.id} scooter={scooter} {...rest} />;
}

function ScooterEditForm({
  scooter,
  onClose,
  onRename,
  onDelete,
}: ScooterEditSheetProps & { scooter: Scooter }) {
  const c = usePalette();
  const [name, setName] = useState(scooter.name);
  const running = scooter.startedAt !== null;

  return (
    <Sheet visible title={scooter.name} onClose={onClose}>
      <Field label="Scooter name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Scooter name"
          placeholderTextColor={c.faint}
          className={inputClassName}
          maxLength={32}
        />
      </Field>
      <Button
        label="Save"
        variant="scoot"
        disabled={name.trim().length === 0}
        onPress={() => {
          onRename(scooter.id, name);
          onClose();
        }}
        className="mb-3"
      />
      <Button
        label={running ? 'End the ride before deleting' : 'Delete scooter'}
        variant="danger"
        icon="trash-outline"
        disabled={running}
        onPress={() =>
          Alert.alert('Delete', `Remove ${scooter.name} and its ride history?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                onDelete(scooter.id);
                onClose();
              },
            },
          ])
        }
      />
    </Sheet>
  );
}
