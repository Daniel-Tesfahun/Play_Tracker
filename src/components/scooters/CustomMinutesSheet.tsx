import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Scooter } from '@/db/types';
import { addAllocation, MAX_ALLOCATED_MINUTES, parseCustomMinutes } from '@/lib/timer';
import { formatMinutes } from '@/lib/time';
import { usePalette } from '@/theme/usePalette';

const QUICK_PICKS = [5, 10, 20, 45, 90, 120] as const;

interface CustomMinutesSheetProps {
  scooter: Scooter | null;
  onClose: () => void;
  onAdd: (id: number, minutes: number) => void;
}

export function CustomMinutesSheet({ scooter, ...rest }: CustomMinutesSheetProps) {
  if (!scooter) return null;
  // Keyed so the field starts empty for each scooter.
  return <CustomMinutesForm key={scooter.id} scooter={scooter} {...rest} />;
}

function CustomMinutesForm({ scooter, onClose, onAdd }: CustomMinutesSheetProps & { scooter: Scooter }) {
  const c = usePalette();
  const [text, setText] = useState('');
  const minutes = parseCustomMinutes(text);
  const room = MAX_ALLOCATED_MINUTES - scooter.allocatedMinutes;
  const nextTotal = minutes === null ? null : addAllocation(scooter.allocatedMinutes, minutes);
  const running = scooter.startedAt !== null;

  const submit = () => {
    if (minutes === null || room <= 0) return;
    onAdd(scooter.id, minutes);
    onClose();
  };

  return (
    <Sheet visible title={`Add time · ${scooter.name}`} onClose={onClose}>
      <Field label="Minutes">
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 3))}
          placeholder="e.g. 25"
          placeholderTextColor={c.faint}
          keyboardType="number-pad"
          className={`${inputClassName} text-2xl font-bold`}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          testID="custom-minutes-input"
          accessibilityLabel="Minutes to add"
        />
      </Field>

      <View className="mb-4 flex-row flex-wrap gap-2">
        {QUICK_PICKS.map((m) => (
          <PressableScale
            key={m}
            onPress={() => setText(String(m))}
            accessibilityRole="button"
            accessibilityLabel={`${m} minutes`}
            testID={`custom-pick-${m}`}
            pressedScale={0.92}
            className={`h-11 min-w-[64px] items-center justify-center rounded-full border px-4 ${
              minutes === m ? 'border-scoot bg-scoot' : 'border-scoot/30 bg-scootDim'
            }`}
          >
            <Text className={`text-sm font-bold ${minutes === m ? 'text-canvas' : 'text-scoot'}`}>{formatMinutes(m)}</Text>
          </PressableScale>
        ))}
      </View>

      <Text className="mb-4 text-sm font-medium text-muted" testID="custom-minutes-summary">
        {room <= 0
          ? `Already at the ${formatMinutes(MAX_ALLOCATED_MINUTES)} limit.`
          : nextTotal === null
            ? scooter.allocatedMinutes > 0
              ? `Booked now: ${formatMinutes(scooter.allocatedMinutes)}`
              : 'Nothing booked yet.'
            : `${running ? 'Ride' : 'Booking'} becomes ${formatMinutes(nextTotal)}${
                nextTotal === MAX_ALLOCATED_MINUTES ? ' (the maximum)' : ''
              }`}
      </Text>

      <Button
        label={minutes === null ? 'Add minutes' : `Add ${formatMinutes(minutes)}`}
        variant="scoot"
        icon="add"
        disabled={minutes === null || room <= 0}
        onPress={submit}
        testID="custom-minutes-add"
        className="mb-3"
      />
      <Button label="Cancel" onPress={onClose} />
    </Sheet>
  );
}
