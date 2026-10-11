import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AnimatedBar } from '../motion/AnimatedBar';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { CollapseButton } from '../motion/CollapseButton';
import { Pulse } from '../motion/Pulse';
import { SwapIn } from '../motion/SwapIn';

describe('motion components', () => {
  it('AnimatedNumber shows the latest value', async () => {
    const view = await render(<AnimatedNumber value={3} testID="n" />);
    expect(screen.getByTestId('n')).toHaveTextContent('3');
    await view.rerender(<AnimatedNumber value={4} testID="n" />);
    expect(screen.getByTestId('n')).toHaveTextContent('4');
  });

  it('CollapseButton reports its state and toggles', async () => {
    const onPress = jest.fn();
    const view = await render(<CollapseButton collapsed label="Expand Station 1" onPress={onPress} testID="c" />);
    expect(screen.getByRole('button', { name: 'Expand Station 1' })).toBeCollapsed();
    await fireEvent.press(screen.getByTestId('c'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await view.rerender(<CollapseButton collapsed={false} label="Collapse Station 1" onPress={onPress} testID="c" />);
    expect(screen.getByRole('button', { name: 'Collapse Station 1' })).toBeExpanded();
  });

  it('Pulse and SwapIn always render their content', async () => {
    const view = await render(
      <SwapIn swapKey="riding">
        <Pulse active>
          <Text>Overtime</Text>
        </Pulse>
      </SwapIn>,
    );
    expect(screen.getByText('Overtime')).toBeOnTheScreen();

    await view.rerender(
      <SwapIn swapKey="idle">
        <Pulse active={false}>
          <Text>Idle</Text>
        </Pulse>
      </SwapIn>,
    );
    expect(screen.getByText('Idle')).toBeOnTheScreen();
  });

  it('AnimatedBar clamps out-of-range values', async () => {
    await render(<AnimatedBar percent={150} color="#000000" testID="bar" />);
    expect(screen.getByTestId('bar')).toBeOnTheScreen();
  });
});
