import { router } from 'expo-router';

/** Back to the landing screen; falls back to replacing the route if there's no history (deep link). */
export function goHome(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
