import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from './IconButton';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet built on Modal: tap the backdrop or the close button to dismiss. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <Pressable
          className="absolute inset-0 bg-black/60"
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View
          className="rounded-t-[28px] border border-b-0 border-line bg-surface px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-lineStrong" />
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink">{title}</Text>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-faint">{label}</Text>
      {children}
    </View>
  );
}

export const inputClassName =
  'h-12 rounded-2xl border border-line bg-elevated px-4 text-base font-medium text-ink';
