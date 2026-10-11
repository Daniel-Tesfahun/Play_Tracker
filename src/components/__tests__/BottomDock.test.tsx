import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomDock, DOCK_HEIGHT, dockSpace, type DockAction } from '../ui/BottomDock';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 24 },
};

function renderDock(actions: DockAction[]) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <BottomDock actions={actions} />
    </SafeAreaProvider>,
  );
}

describe('BottomDock', () => {
  it('runs each action from the dock', async () => {
    const add = jest.fn();
    const collapse = jest.fn();
    const reset = jest.fn();
    await renderDock([
      { key: 'add', label: 'Station', accessibilityLabel: 'Add station', icon: 'add', tone: 'brand', onPress: add },
      { key: 'collapse', label: 'Collapse', icon: 'chevron-collapse', tone: 'neutral', onPress: collapse },
      { key: 'reset', label: 'Reset day', icon: 'refresh', tone: 'danger', onPress: reset },
    ]);

    await fireEvent.press(screen.getByTestId('dock-add'));
    await fireEvent.press(screen.getByTestId('dock-collapse'));
    await fireEvent.press(screen.getByTestId('dock-reset'));

    expect(add).toHaveBeenCalledTimes(1);
    expect(collapse).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('uses the longer spoken label for screen readers', async () => {
    await renderDock([
      { key: 'add', label: 'Station', accessibilityLabel: 'Add station', icon: 'add', tone: 'brand', onPress: jest.fn() },
    ]);
    expect(screen.getByLabelText('Add station')).toBeOnTheScreen();
  });

  it('ignores presses on disabled actions', async () => {
    const reset = jest.fn();
    await renderDock([{ key: 'reset', label: 'Reset day', icon: 'refresh', tone: 'danger', onPress: reset, disabled: true }]);
    await fireEvent.press(screen.getByTestId('dock-reset'));
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reset day' })).toBeDisabled();
  });

  it('reserves enough list space to clear the dock and the gesture bar', () => {
    expect(dockSpace(24)).toBe(DOCK_HEIGHT + 24 + 16);
    // Phones without a gesture inset still get the minimum gap.
    expect(dockSpace(0)).toBe(DOCK_HEIGHT + 12 + 16);
  });
});
