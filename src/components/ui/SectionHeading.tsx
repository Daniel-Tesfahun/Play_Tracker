import { Text } from 'react-native';

/** Small uppercase label above a list, e.g. "Stations · 6". */
export function SectionHeading({ title }: { title: string }) {
  return (
    <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-faint" accessibilityRole="header">
      {title}
    </Text>
  );
}
