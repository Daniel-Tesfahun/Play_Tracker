import { Alert } from 'react-native';

/** Native confirm dialog for destructive actions; `action` runs only on confirm. */
export function confirmDestructive(title: string, message: string, confirmLabel: string, action: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: action },
  ]);
}
