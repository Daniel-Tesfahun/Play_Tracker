import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Scooter } from '@/db/types';
import { MAX_ALLOCATED_MINUTES } from '@/lib/timer';

import { CustomMinutesSheet } from '../scooters/CustomMinutesSheet';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const scooter: Scooter = {
  id: 3,
  name: 'Scooter 3',
  startedAt: null,
  allocatedMinutes: 15,
  pausedAt: null,
  pausedMs: 0,
  position: 3,
};

async function renderSheet(s: Scooter = scooter) {
  const onAdd = jest.fn();
  const onClose = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <CustomMinutesSheet scooter={s} onAdd={onAdd} onClose={onClose} />
    </SafeAreaProvider>,
  );
  return { onAdd, onClose };
}

describe('CustomMinutesSheet', () => {
  it('adds typed minutes and closes', async () => {
    const { onAdd, onClose } = await renderSheet();
    await fireEvent.changeText(screen.getByTestId('custom-minutes-input'), '25');
    expect(screen.getByTestId('custom-minutes-summary')).toHaveTextContent('Booking becomes 40m');
    await fireEvent.press(screen.getByTestId('custom-minutes-add'));
    expect(onAdd).toHaveBeenCalledWith(3, 25);
    expect(onClose).toHaveBeenCalled();
  });

  it('fills the field from a quick pick', async () => {
    const { onAdd } = await renderSheet();
    await fireEvent.press(screen.getByTestId('custom-pick-45'));
    expect(screen.getByText('Add 45m')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('custom-minutes-add'));
    expect(onAdd).toHaveBeenCalledWith(3, 45);
  });

  it('keeps only digits and refuses zero', async () => {
    const { onAdd } = await renderSheet();
    await fireEvent.changeText(screen.getByTestId('custom-minutes-input'), '0');
    await fireEvent.press(screen.getByTestId('custom-minutes-add'));
    expect(onAdd).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('custom-minutes-input'), '2a0');
    expect(screen.getByTestId('custom-minutes-input')).toHaveDisplayValue('20');
  });

  it('says when the booking is already at the limit', async () => {
    const { onAdd } = await renderSheet({ ...scooter, allocatedMinutes: MAX_ALLOCATED_MINUTES });
    expect(screen.getByTestId('custom-minutes-summary')).toHaveTextContent(/limit/);
    await fireEvent.changeText(screen.getByTestId('custom-minutes-input'), '10');
    await fireEvent.press(screen.getByTestId('custom-minutes-add'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('talks about the ride, not a booking, when the scooter is running', async () => {
    await renderSheet({ ...scooter, startedAt: Date.now() });
    await fireEvent.changeText(screen.getByTestId('custom-minutes-input'), '30');
    expect(screen.getByTestId('custom-minutes-summary')).toHaveTextContent('Ride becomes 45m');
  });
});
