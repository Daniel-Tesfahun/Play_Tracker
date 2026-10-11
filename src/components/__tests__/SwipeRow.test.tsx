import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SwipeRow } from '../ui/SwipeRow';

const actions = () => ({
  left: { label: 'Delete', icon: 'trash-outline' as const, fill: 'danger' as const, ink: 'canvas' as const, onPress: jest.fn() },
  right: { label: 'Edit', icon: 'create-outline' as const, fill: 'brand' as const, ink: 'onAccent' as const, onPress: jest.fn() },
});

describe('SwipeRow', () => {
  it('renders the card with delete behind the left edge and edit behind the right', async () => {
    const { left, right } = actions();
    await render(
      <SwipeRow left={left} right={right} testID="row">
        <Text>Station 1</Text>
      </SwipeRow>,
    );
    expect(screen.getByText('Station 1')).toBeOnTheScreen();
    expect(screen.getByTestId('row-swipe-left')).toHaveTextContent(/Delete/);
    expect(screen.getByTestId('row-swipe-right')).toHaveTextContent(/Edit/);
  });

  it('runs the revealed action when tapped', async () => {
    const { left, right } = actions();
    await render(
      <SwipeRow left={left} right={right} testID="row">
        <Text>Station 1</Text>
      </SwipeRow>,
    );
    await fireEvent.press(screen.getByTestId('row-swipe-left'));
    await fireEvent.press(screen.getByTestId('row-swipe-right'));
    expect(left.onPress).toHaveBeenCalledTimes(1);
    expect(right.onPress).toHaveBeenCalledTimes(1);
  });

  it('hides the actions when swiping is disabled', async () => {
    const { left, right } = actions();
    await render(
      <SwipeRow left={left} right={right} enabled={false} testID="row">
        <Text>Station 1</Text>
      </SwipeRow>,
    );
    expect(screen.queryByTestId('row-swipe-left')).toBeNull();
    expect(screen.queryByTestId('row-swipe-right')).toBeNull();
  });

  it('only renders the sides it was given', async () => {
    const { right } = actions();
    await render(
      <SwipeRow right={right} testID="row">
        <Text>Station 1</Text>
      </SwipeRow>,
    );
    expect(screen.queryByTestId('row-swipe-left')).toBeNull();
    expect(screen.getByTestId('row-swipe-right')).toBeOnTheScreen();
  });
});
