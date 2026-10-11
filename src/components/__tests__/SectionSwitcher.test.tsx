import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SectionSwitcher } from '../navigation/SectionSwitcher';

function makeProps(index: number) {
  const routes = [
    { key: 'index-key', name: 'index', params: undefined },
    { key: 'scooters-key', name: 'scooters', params: undefined },
  ];
  const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };
  const props = {
    state: { index, routes, key: 'tabs', routeNames: ['index', 'scooters'], type: 'tab', stale: false, history: [] },
    descriptors: {},
    navigation,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  return { props, navigation };
}

// The app root provides safe-area insets; tests need the same for the confirm sheet.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderSwitcher = (props: BottomTabBarProps) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <SectionSwitcher {...props} />
    </SafeAreaProvider>,
  );

describe('SectionSwitcher', () => {
  it('shows only the current section', async () => {
    const { props } = makeProps(0);
    await renderSwitcher(props);
    expect(screen.getByText('PS')).toBeOnTheScreen();
    expect(screen.queryByText('Scooters')).toBeNull();
  });

  it('asks for confirmation before switching', async () => {
    const { props, navigation } = makeProps(0);
    await renderSwitcher(props);

    await fireEvent.press(screen.getByTestId('section-switcher'));
    expect(screen.getByText('Switch section?')).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('section-switch-confirm'));
    expect(navigation.navigate).toHaveBeenCalledWith('scooters', undefined);
  });

  it('stays put when the switch is cancelled', async () => {
    const { props, navigation } = makeProps(1);
    await renderSwitcher(props);

    await fireEvent.press(screen.getByTestId('section-switcher'));
    expect(screen.getByText('Switch to PS')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('section-switch-cancel'));

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(screen.queryByText('Switch section?')).toBeNull();
  });
});
