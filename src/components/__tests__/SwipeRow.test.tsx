import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DragTracker, OPEN_THRESHOLD, OPEN_WIDTH, SwipeRow } from '../ui/SwipeRow';

const actions = () => ({
  left: { label: 'Edit', icon: 'create-outline' as const, tone: 'brand' as const, onPress: jest.fn() },
  right: { label: 'Delete', icon: 'trash-outline' as const, tone: 'danger' as const, onPress: jest.fn() },
});

describe('SwipeRow', () => {
  it('puts Edit behind the left edge (drag right) and Delete behind the right (drag left)', async () => {
    const { left, right } = actions();
    await render(
      <SwipeRow left={left} right={right} testID="row">
        <Text>Station 1</Text>
      </SwipeRow>,
    );
    expect(screen.getByText('Station 1')).toBeOnTheScreen();
    expect(screen.getByTestId('row-swipe-left')).toHaveTextContent(/Edit/);
    expect(screen.getByTestId('row-swipe-right')).toHaveTextContent(/Delete/);
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

describe('DragTracker', () => {
  it('measures the card offset from where the finger started, plus any open offset', () => {
    const t = new DragTracker();
    t.begin(100, 0, false);
    expect(t.offset(160)).toBe(60);
    expect(t.offset(40)).toBe(-60);

    // Dragging an already-open card continues from its open position.
    t.begin(100, OPEN_WIDTH, true);
    expect(t.offset(80)).toBe(OPEN_WIDTH - 20);
  });

  it('reports crossing the open threshold once per drag', () => {
    const t = new DragTracker();
    t.begin(0, 0, false);
    expect(t.crossedOpen(OPEN_THRESHOLD - 1)).toBe(false);
    expect(t.crossedOpen(OPEN_THRESHOLD + 1)).toBe(true);
    expect(t.crossedOpen(OPEN_THRESHOLD + 30)).toBe(false);

    // A card that started open doesn't buzz again for opening.
    t.begin(0, OPEN_WIDTH, true);
    expect(t.crossedOpen(OPEN_WIDTH)).toBe(false);
  });

  it('re-arms the full-swipe signal when the drag backs off', () => {
    const t = new DragTracker();
    t.begin(0, 0, false);
    expect(t.crossedFull(250, 200)).toBe(true);
    expect(t.crossedFull(260, 200)).toBe(false);
    expect(t.crossedFull(150, 200)).toBe(false); // backed off
    expect(t.crossedFull(210, 200)).toBe(true); // crossed again
  });
});
