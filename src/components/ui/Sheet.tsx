import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

import { IconButton } from './IconButton';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Room kept above the sheet so the backdrop stays tappable to dismiss. */
const TOP_GAP = 48;

/**
 * Bottom sheet built on Modal: tap the backdrop or the close button to dismiss.
 *
 * Android doesn't resize a Modal's window for the keyboard (and KeyboardAvoidingView
 * does nothing there), so the sheet lifts itself by the keyboard's height and its
 * content scrolls when sheet + keyboard would be taller than the screen.
 */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const keyboard = useKeyboardHeight();

  const bottomPad = keyboard > 0 ? keyboard + 12 : Math.max(insets.bottom, 16) + 8;
  const maxHeight = screenHeight - insets.top - TOP_GAP;

  return (
    <Modal
      visible={visible}
      transparent
      // The Modal only fades (the backdrop); the sheet itself springs up below.
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={SlideInDown.springify().damping(20).stiffness(220)}>
          <View
            className="rounded-t-[28px] border border-b-0 border-line bg-surface px-5 pt-3"
            style={{ paddingBottom: bottomPad, maxHeight }}
            testID="sheet"
          >
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-lineStrong" />
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="flex-1 text-lg font-bold text-ink" numberOfLines={1}>
                {title}
              </Text>
              <IconButton icon="close" label="Close" onPress={onClose} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={{ flexGrow: 0 }}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
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

export const inputClassName = 'h-12 rounded-2xl border border-line bg-elevated px-4 text-base font-medium text-ink';
