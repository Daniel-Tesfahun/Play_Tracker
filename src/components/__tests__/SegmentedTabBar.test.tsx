import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { SegmentedTabBar } from '../navigation/SegmentedTabBar';

function makeProps(index: number) {
  const routes = [
    { key: 'index-key', name: 'index', params: undefined },
    { key: 'scooters-key', name: 'scooters', params: undefined },
  ];
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const props = {
    state: { index, routes, key: 'tabs', routeNames: ['index', 'scooters'], type: 'tab', stale: false, history: [] },
    descriptors: {
      'index-key': { options: { title: 'Gaming Zones' } },
      'scooters-key': { options: { title: 'Scooters' } },
    },
    navigation,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  return { props, navigation };
}

describe('SegmentedTabBar', () => {
  it('shows both sections in one switch and marks the selected one', async () => {
    const { props } = makeProps(0);
    await render(<SegmentedTabBar {...props} />);

    expect(screen.getByRole('tab', { name: 'Gaming Zones' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Scooters' })).not.toBeSelected();
  });

  it('switches section when the other side is pressed', async () => {
    const { props, navigation } = makeProps(0);
    await render(<SegmentedTabBar {...props} />);

    await fireEvent.press(screen.getByTestId('tab-scooters'));
    expect(navigation.navigate).toHaveBeenCalledWith('scooters', undefined);
  });

  it('does nothing when the current section is pressed again', async () => {
    const { props, navigation } = makeProps(1);
    await render(<SegmentedTabBar {...props} />);

    await fireEvent.press(screen.getByTestId('tab-scooters'));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
