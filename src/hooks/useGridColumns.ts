import { useWindowDimensions } from 'react-native';

/** Full-width cards on phones, 2 columns on small tablets / landscape, 3 on large tablets. */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  if (width >= 1000) return 3;
  if (width >= 640) return 2;
  return 1;
}
