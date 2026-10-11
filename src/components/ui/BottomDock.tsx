import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Palette } from '@/theme/palette';
import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

export type DockTone = 'brand' | 'scoot' | 'go' | 'neutral' | 'danger';

/** Literal class names per tone so Tailwind can see them. */
const TONES: Record<DockTone, { box: string; text: string; icon: keyof Palette }> = {
  brand: { box: 'bg-brand', text: 'text-onAccent', icon: 'onAccent' },
  scoot: { box: 'bg-scoot', text: 'text-canvas', icon: 'canvas' },
  go: { box: 'bg-neon', text: 'text-canvas', icon: 'canvas' },
  neutral: { box: 'border border-line bg-elevated', text: 'text-ink', icon: 'ink' },
  danger: { box: 'border border-danger/30 bg-dangerDim', text: 'text-danger', icon: 'danger' },
};

export interface DockAction {
  key: string;
  label: string;
  /** Spoken label when the visible one is short (e.g. "Add station"). */
  accessibilityLabel?: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone: DockTone;
  onPress: () => void;
  disabled?: boolean;
}

/** Visible height of the normal dock, excluding the safe-area inset below it. */
export const DOCK_HEIGHT = 76;
/** Visible height of the bulk-actions dock (status row + actions row). */
export const BULK_DOCK_HEIGHT = 128;

const SHADOW = {
  elevation: 12,
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
} as const;

function DockButton({ action, stretch }: { action: DockAction; stretch: boolean }) {
  const c = usePalette();
  const t = TONES[action.tone];
  return (
    <PressableScale
      onPress={action.onPress}
      disabled={action.disabled}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityState={{ disabled: !!action.disabled }}
      testID={`dock-${action.key}`}
      pressedScale={0.94}
      containerStyle={stretch ? { flex: 1 } : undefined}
      className={`h-14 flex-row items-center justify-center gap-1.5 rounded-2xl px-4 ${t.box}`}
    >
      <Ionicons name={action.icon} size={18} color={c[t.icon]} />
      <Text className={`text-sm font-bold ${t.text}`} numberOfLines={1}>
        {action.label}
      </Text>
    </PressableScale>
  );
}

function DockFrame({
  children,
  testID,
  entering,
}: {
  children: ReactNode;
  testID?: string;
  entering?: ComponentProps<typeof Animated.View>['entering'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={entering}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        accessibilityRole="toolbar"
        testID={testID}
        className="rounded-3xl border border-line bg-surface p-2"
        style={SHADOW}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/**
 * Floating bar of the screen's most-used actions, kept within thumb reach.
 * Lists add `dockSpace(insets.bottom)` of bottom padding so nothing hides behind it.
 */
export function BottomDock({ actions }: { actions: DockAction[] }) {
  return (
    <DockFrame testID="dock">
      <View className="flex-row gap-2">
        {actions.map((a) => (
          <DockButton key={a.key} action={a} stretch />
        ))}
      </View>
    </DockFrame>
  );
}

interface BulkDockProps {
  count: number;
  /** e.g. "stations" / "scooters" for "3 stations selected". */
  noun: [singular: string, plural: string];
  allSelected: boolean;
  onToggleAll: () => void;
  onDone: () => void;
  actions: DockAction[];
}

/** Takes the dock's place while selecting: selection status on top, bulk actions below (scrolls sideways). */
export function BulkDock({ count, noun, allSelected, onToggleAll, onDone, actions }: BulkDockProps) {
  const c = usePalette();
  const label = `${count} ${count === 1 ? noun[0] : noun[1]} selected`;

  return (
    <DockFrame testID="bulk-dock" entering={SlideInDown.springify().damping(20).stiffness(220)}>
      <View className="mb-2 flex-row items-center gap-2 px-2 pt-1">
        <Animated.View key={count} entering={FadeIn.duration(150)} style={{ flex: 1 }}>
          <Text className="text-base font-extrabold text-ink" accessibilityLiveRegion="polite" testID="bulk-count">
            {label}
          </Text>
        </Animated.View>
        <PressableScale
          onPress={onToggleAll}
          accessibilityRole="button"
          accessibilityLabel={allSelected ? 'Select none' : 'Select all'}
          testID="bulk-toggle-all"
          pressedScale={0.94}
          className="h-11 flex-row items-center gap-1.5 rounded-full px-3"
        >
          <Ionicons name={allSelected ? 'remove-circle-outline' : 'checkmark-done'} size={18} color={c.muted} />
          <Text className="text-sm font-bold text-muted">{allSelected ? 'None' : 'All'}</Text>
        </PressableScale>
        <PressableScale
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Done selecting"
          testID="bulk-done"
          pressedScale={0.94}
          className="h-11 items-center justify-center rounded-full bg-ink px-4"
        >
          <Text className="text-sm font-bold text-canvas">Done</Text>
        </PressableScale>
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Let a horizontal drag that starts on a button scroll the row instead of pressing it.
          canCancelContentTouches
          nestedScrollEnabled
          decelerationRate="fast"
          contentContainerStyle={{ gap: 8, paddingRight: 24 }}
          testID="bulk-actions"
        >
          {actions.map((a) => (
            <DockButton key={a.key} action={{ ...a, disabled: a.disabled || count === 0 }} stretch={false} />
          ))}
        </ScrollView>
        {/* Fade at the right edge hints that more actions are off-screen. */}
        <LinearGradient
          pointerEvents="none"
          colors={[`${c.surface}00`, c.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 28 }}
        />
      </View>
    </DockFrame>
  );
}

/** Bottom padding a scrolling list needs so its last card clears the dock. */
export function dockSpace(bottomInset: number, bulk = false): number {
  return (bulk ? BULK_DOCK_HEIGHT : DOCK_HEIGHT) + Math.max(bottomInset, 12) + 16;
}
