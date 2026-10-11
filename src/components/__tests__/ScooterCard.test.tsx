import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Scooter } from '@/db/types';
import type { ClockPrefs } from '@/lib/time';

import { ScooterCard } from '../scooters/ScooterCard';

const MIN = 60_000;
const START = new Date(2026, 9, 10, 14, 5).getTime();
const H24: ClockPrefs = { locale: 'en-GB', hour12: false };

const idle: Scooter = { id: 7, name: 'Scooter 7', startedAt: null, allocatedMinutes: 0, position: 1 };

async function renderCard(scooter: Scooter, now: number, clock: ClockPrefs = H24) {
  const props = {
    onAllocate: jest.fn(),
    onClearAllocation: jest.fn(),
    onStart: jest.fn(),
    onStop: jest.fn(),
    onReset: jest.fn(),
    onEdit: jest.fn(),
  };
  await render(<ScooterCard scooter={scooter} now={now} clock={clock} {...props} />);
  return props;
}

describe('ScooterCard', () => {
  it('shows an idle badge and a start button when idle', async () => {
    const props = await renderCard(idle, START);
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Idle');
    await fireEvent.press(screen.getByTestId('scooter-start-7'));
    expect(props.onStart).toHaveBeenCalledWith(7);
  });

  it('sends preset minutes from the quick-add bubbles', async () => {
    const props = await renderCard(idle, START);
    await fireEvent.press(screen.getByTestId('preset-7-15'));
    await fireEvent.press(screen.getByTestId('preset-7-60'));
    expect(props.onAllocate).toHaveBeenNthCalledWith(1, 7, 15);
    expect(props.onAllocate).toHaveBeenNthCalledWith(2, 7, 60);
  });

  it('counts down and shows the auto-detected start time while riding', async () => {
    await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 10 * MIN);
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Riding');
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('20:00');
    expect(screen.getByTestId('scooter-caption-7')).toHaveTextContent(/Started 14:05/);
  });

  it("formats start and end times with the phone's 12-hour setting", async () => {
    await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 10 * MIN, {
      locale: 'en-US',
      hour12: true,
    });
    expect(screen.getByTestId('scooter-caption-7')).toHaveTextContent(/Started 2:05\sPM/);
    expect(screen.getByText(/Ends 2:35\sPM/)).toBeOnTheScreen();
  });

  it('shows a large progress bar with percentage and milestone labels', async () => {
    await renderCard({ ...idle, startedAt: START, allocatedMinutes: 60 }, START + 30 * MIN);
    expect(screen.getByTestId('timer-progress')).toBeOnTheScreen();
    // Once as the live percentage, once as the 50% milestone label.
    expect(screen.getAllByText('50%')).toHaveLength(2);
    expect(screen.getByText('25%')).toBeOnTheScreen();
    expect(screen.getByText('75%')).toBeOnTheScreen();
  });

  it('counts up when started without an allocation', async () => {
    await renderCard({ ...idle, startedAt: START }, START + 7 * MIN + 5000);
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('7:05');
  });

  it('flags the last minutes as ending soon', async () => {
    await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 27 * MIN);
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Ending soon');
  });

  it('shows overtime once the allocation runs out and can end the ride', async () => {
    const props = await renderCard({ ...idle, startedAt: START, allocatedMinutes: 15 }, START + 18 * MIN);
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Overtime');
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('+3:00');
    await fireEvent.press(screen.getByTestId('scooter-stop-7'));
    expect(props.onStop).toHaveBeenCalledWith(7);
  });

  it('can reset a running ride from the card', async () => {
    const props = await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + MIN);
    await fireEvent.press(screen.getByTestId('scooter-reset-7'));
    expect(props.onReset).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('disables reset when there is nothing to reset', async () => {
    const props = await renderCard(idle, START);
    await fireEvent.press(screen.getByTestId('scooter-reset-7'));
    expect(props.onReset).not.toHaveBeenCalled();
  });
});
