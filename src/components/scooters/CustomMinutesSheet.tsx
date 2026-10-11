import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Field, inputClassName, Sheet } from '@/components/ui/Sheet';
import type { Scooter } from '@/db/types';
import { addAllocation, MAX_ALLOCATED_MINUTES, parseCustomMinutes } from '@/lib/timer';
import { formatMinutes } from '@/lib/time';
import { usePalette } from '@/theme/usePalette';

const QUICK_PICKS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

interface CustomMinutesSheetProps {
  /** One scooter (from its card) or several (bulk). Hidden when empty. */
  scooters: Scooter[];
  onClose: () => void;
  onAdd: (ids: number[], minutes: number) => void;
}

export function CustomMinutesSheet({ scooters, ...rest }: CustomMinutesSheetProps) {
  if (scooters.length === 0) return null;
  // Keyed so the field starts empty for each new target set.
  return <CustomMinutesForm key={scooters.map((s) => s.id).join('-')} scooters={scooters} {...rest} />;
}

function summary(scooters: Scooter[], minutes: number | null): string {
  if (scooters.length === 1) {
    const s = scooters[0]!;
    if (s.allocatedMinutes >= MAX_ALLOCATED_MINUTES) return `Already at the ${formatMinutes(MAX_ALLOCATED_MINUTES)} limit.`;
    if (minutes === null) return s.allocatedMinutes > 0 ? `Booked now: ${formatMinutes(s.allocatedMinutes)}` : 'Nothing booked yet.';
    const next = addAllocation(s.allocatedMinutes, minutes);
    return `${s.startedAt !== null ? 'Ride' : 'Booking'} becomes ${formatMinutes(next)}${
      next === MAX_ALLOCATED_MINUTES ? ' (the maximum)' : ''
    }`;
  }
  const full = scooters.filter((s) => s.allocatedMinutes >= MAX_ALLOCATED_MINUTES).length;
  if (full === scooters.length) return `All ${scooters.length} are already at the ${formatMinutes(MAX_ALLOCATED_MINUTES)} limit.`;
  const base = minutes === null ? `Adds time to ${scooters.length} scooters.` : `Adds ${formatMinutes(minutes)} to each of ${scooters.length} scooters.`;
  return full > 0 ? `${base} ${full} already at the limit won't change.` : base;
}

function CustomMinutesForm({ scooters, onClose, onAdd }: CustomMinutesSheetProps) {
  const c = usePalette();
  const [text, setText] = useState('');
  const minutes = parseCustomMinutes(text);
  const anyRoom = scooters.some((s) => s.allocatedMinutes < MAX_ALLOCATED_MINUTES);
  const title = scooters.length === 1 ? `Add time · ${scooters[0]!.name}` : `Add time · ${scooters.length} scooters`;

  const submit = () => {
    if (minutes === null || !anyRoom) return;
    onAdd(
      scooters.map((s) => s.id),
      minutes,
    );
    onClose();
  };

  return (
    <Sheet visible title={title} onClose={onClose}>
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
        {summary(scooters, minutes)}
      </Text>

      <Button
        label={minutes === null ? 'Add minutes' : `Add ${formatMinutes(minutes)}`}
        variant="scoot"
        icon="add"
        disabled={minutes === null || !anyRoom}
        onPress={submit}
        testID="custom-minutes-add"
        className="mb-3"
      />
      <Button label="Cancel" onPress={onClose} />
    </Sheet>
  );
}
