import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '../ui/PressableScale';

/** Disabled dimming is applied to the Pressable itself, never to the animated wrapper. */
function buttonOpacity(testID: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style)?.opacity;
}

function wrapperOpacity(testID: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(testID).parent?.props.style)?.opacity;
}

describe('PressableScale', () => {
  it('dims when disabled', async () => {
    await render(
      <PressableScale testID="btn" disabled onPress={jest.fn()}>
        <Text>Reset</Text>
      </PressableScale>,
    );
    expect(buttonOpacity('btn')).toBe(0.4);
  });

  it('dims after becoming disabled, and undims when re-enabled', async () => {
    const view = await render(
      <PressableScale testID="btn" onPress={jest.fn()}>
        <Text>Reset</Text>
      </PressableScale>,
    );
    expect(buttonOpacity('btn')).toBeUndefined();

    await view.rerender(
      <PressableScale testID="btn" disabled onPress={jest.fn()}>
        <Text>Reset</Text>
      </PressableScale>,
    );
    expect(buttonOpacity('btn')).toBe(0.4);

    await view.rerender(
      <PressableScale testID="btn" onPress={jest.fn()}>
        <Text>Reset</Text>
      </PressableScale>,
    );
    expect(buttonOpacity('btn')).toBeUndefined();
  });

  it('never swaps the animated press opacity for a plain number', async () => {
    const view = await render(
      <PressableScale testID="btn" disabled onPress={jest.fn()}>
        <Text>Reset</Text>
      </PressableScale>,
    );
    // The wrapper's opacity stays a number driven by Animated (1 at rest), enabled or not.
    expect(wrapperOpacity('btn')).toBe(1);
    await view.rerender(
      <PressableScale testID="btn" onPress={jest.fn()}>
        <Text>Reset</Text>
      </PressableScale>,
    );
    expect(wrapperOpacity('btn')).toBe(1);
  });
});
