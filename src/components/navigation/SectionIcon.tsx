import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { SectionInfo } from './sections';

export function SectionIcon({ icon, size, color }: { icon: SectionInfo['icon']; size: number; color: string }) {
  return icon === 'scooter' ? (
    <MaterialCommunityIcons name="scooter" size={size} color={color} />
  ) : (
    <Ionicons name="game-controller" size={size} color={color} />
  );
}
