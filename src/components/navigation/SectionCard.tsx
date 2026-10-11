import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { PressableScale } from '@/components/ui/PressableScale';
import { useGradients } from '@/theme/usePalette';

import { SectionIcon } from './SectionIcon';
import type { SectionInfo } from './sections';

interface SectionCardProps {
  section: SectionInfo;
  /** Live numbers for today, e.g. [{ label: 'Games today', value: '12' }]. */
  stats: { label: string; value: string }[];
  onOpen: () => void;
}

/** A big, tappable entry point into one section on the landing screen. */
export function SectionCard({ section, stats, onOpen }: SectionCardProps) {
  const gradients = useGradients();

  return (
    <PressableScale
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${section.title}. ${stats.map((s) => `${s.label} ${s.value}`).join(', ')}`}
      testID={`section-card-${section.id}`}
      pressedScale={0.97}
    >
      <LinearGradient
        colors={gradients[section.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 28, padding: 20 }}
      >
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-black/20">
            <SectionIcon icon={section.icon} size={32} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-3xl font-extrabold text-white">{section.title}</Text>
            <Text className="text-sm font-semibold text-white" numberOfLines={1}>
              {section.description}
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-black/20">
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </View>
        </View>

        <View className="mt-5 flex-row gap-2">
          {stats.map((s) => (
            <View key={s.label} className="flex-1 rounded-2xl bg-black/20 px-3 py-2.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-white" numberOfLines={1}>
                {s.label}
              </Text>
              <AnimatedNumber
                value={s.value}
                className="mt-0.5 text-xl font-extrabold text-white"
                containerStyle={{ alignSelf: 'flex-start' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              />
            </View>
          ))}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}
