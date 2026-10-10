import { useWindowDimensions } from 'react-native';

/** 2 columns on phones, 3 on small tablets / landscape, 4 on large tablets. */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  if (width >= 1000) return 4;
  if (width >= 640) return 3;
  return 2;
}
