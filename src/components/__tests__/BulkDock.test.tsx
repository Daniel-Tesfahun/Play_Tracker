import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BulkDock, BULK_DOCK_HEIGHT, dockSpace } from '../ui/BottomDock';
import { SelectRow } from '../ui/SelectRow';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const wrap = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

describe('BulkDock', () => {
  function renderDock(count: number, allSelected = false) {
    const props = { onToggleAll: jest.fn(), onDone: jest.fn(), onReset: jest.fn(), onDelete: jest.fn() };
    const result = wrap(
      <BulkDock
        count={count}
        noun={['station', 'stations']}
        allSelected={allSelected}
        onToggleAll={props.onToggleAll}
        onDone={props.onDone}
        actions={[
          { key: 'bulk-reset', label: 'Reset today', icon: 'refresh', tone: 'neutral', onPress: props.onReset },
          { key: 'bulk-delete', label: 'Delete', icon: 'trash-outline', tone: 'danger', onPress: props.onDelete },
        ]}
      />,
    );
    return { props, result };
  }

  it('shows how many are selected, with correct plurals', async () => {
    await renderDock(1).result;
    expect(screen.getByTestId('bulk-count')).toHaveTextContent('1 station selected');
  });

  it('runs bulk actions when something is selected', async () => {
    const { props, result } = renderDock(3);
    await result;
    expect(screen.getByTestId('bulk-count')).toHaveTextContent('3 stations selected');
    await fireEvent.press(screen.getByTestId('dock-bulk-reset'));
    await fireEvent.press(screen.getByTestId('dock-bulk-delete'));
    expect(props.onReset).toHaveBeenCalled();
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('disables every action while nothing is selected', async () => {
    const { props, result } = renderDock(0);
    await result;
    await fireEvent.press(screen.getByTestId('dock-bulk-delete'));
    expect(props.onDelete).not.toHaveBeenCalled();
  });

  it('toggles all and finishes selecting', async () => {
    const { props, result } = renderDock(2, true);
    await result;
    expect(screen.getByLabelText('Select none')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('bulk-toggle-all'));
    await fireEvent.press(screen.getByTestId('bulk-done'));
    expect(props.onToggleAll).toHaveBeenCalled();
    expect(props.onDone).toHaveBeenCalled();
  });

  it('reserves more list space than the normal dock', () => {
    expect(dockSpace(0, true)).toBe(BULK_DOCK_HEIGHT + 12 + 16);
    expect(dockSpace(0, true)).toBeGreaterThan(dockSpace(0));
  });
});

describe('SelectRow', () => {
  it('toggles its id and reports checked state', async () => {
    const onToggle = jest.fn();
    const view = await render(
      <SelectRow id={5} title="Station 5" subtitle="EA FC 26" selected={false} onToggle={onToggle} tone="brand" testID="row" trailing={<Text>3</Text>} />,
    );
    expect(screen.getByRole('checkbox', { name: 'Station 5' })).not.toBeChecked();
    await fireEvent.press(screen.getByTestId('row'));
    expect(onToggle).toHaveBeenCalledWith(5);

    await view.rerender(
      <SelectRow id={5} title="Station 5" subtitle="EA FC 26" selected onToggle={onToggle} tone="brand" testID="row" />,
    );
    expect(screen.getByRole('checkbox', { name: 'Station 5' })).toBeChecked();
  });
});
