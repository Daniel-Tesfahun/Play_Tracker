import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Palette } from '@/theme/palette';
import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

type Tone = 'brand' | 'scoot' | 'neutral' | 'danger';

/** Literal class names per tone so Tailwind can see them. */
const TONES: Record<Tone, { box: string; text: string; icon: keyof Palette }> = {
  brand: { box: 'bg-brand', text: 'text-onAccent', icon: 'onAccent' },
  scoot: { box: 'bg-scoot', text: 'text-canvas', icon: 'canvas' },
  neutral: { box: 'border border-line bg-elevated', text: 'text-ink', icon: 'ink' },
  danger: { box: 'border border-danger/30 bg-dangerDim', text: 'text-danger', icon: 'danger' },
};

export interface DockAction {
  key: string;
  label: string;
  /** Spoken label when the visible one is short (e.g. "Add station"). */
  accessibilityLabel?: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone: Tone;
  onPress: () => void;
  disabled?: boolean;
}

/** Visible height of the dock itself, excluding the safe-area inset below it. */
export const DOCK_HEIGHT = 76;

/**
 * Floating bar of the screen's most-used actions, kept within thumb reach.
 * Lists add `dockSpace(insets.bottom)` of bottom padding so nothing hides behind it.
 */
export function BottomDock({ actions }: { actions: DockAction[] }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 px-4"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        accessibilityRole="toolbar"
        className="flex-row gap-2 rounded-3xl border border-line bg-surface p-2"
        style={{ elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
      >
        {actions.map((a) => {
          const t = TONES[a.tone];
          return (
            <PressableScale
              key={a.key}
              onPress={a.onPress}
              disabled={a.disabled}
              accessibilityRole="button"
              accessibilityLabel={a.accessibilityLabel ?? a.label}
              accessibilityState={{ disabled: !!a.disabled }}
              testID={`dock-${a.key}`}
              pressedScale={0.94}
              containerStyle={{ flex: 1 }}
              className={`h-14 flex-row items-center justify-center gap-1.5 rounded-2xl px-2 ${t.box}`}
            >
              <Ionicons name={a.icon} size={18} color={c[t.icon]} />
              <Text className={`text-sm font-bold ${t.text}`} numberOfLines={1}>
                {a.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom padding a scrolling list needs so its last card clears the dock. */
export function dockSpace(bottomInset: number): number {
  return DOCK_HEIGHT + Math.max(bottomInset, 12) + 16;
}
