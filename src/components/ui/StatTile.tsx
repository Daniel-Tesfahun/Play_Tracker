import { Text, View } from 'react-native';

interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  /** Tailwind text color class for the value, e.g. "text-neon". */
  tone?: string;
}

export function StatTile({ label, value, caption, tone = 'text-ink' }: StatTileProps) {
  return (
    <View className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3">
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-faint">{label}</Text>
      <Text
        className={`mt-1 text-2xl font-bold ${tone}`}
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {caption ? (
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
