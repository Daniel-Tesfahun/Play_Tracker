import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Scooter } from '@/db/types';

import { ScooterCard } from '../scooters/ScooterCard';

const MIN = 60_000;
const START = new Date(2026, 9, 10, 14, 5).getTime();

const idle: Scooter = { id: 7, name: 'Scooter 7', startedAt: null, allocatedMinutes: 0, position: 1 };

function renderCard(scooter: Scooter, now: number, handlers: Partial<Record<string, jest.Mock>> = {}) {
  const props = {
    onAllocate: jest.fn(),
    onClearAllocation: jest.fn(),
    onStart: jest.fn(),
    onStop: jest.fn(),
    onEdit: jest.fn(),
    ...handlers,
  };
  return { props, result: render(<ScooterCard scooter={scooter} now={now} {...props} />) };
}

describe('ScooterCard', () => {
  it('shows an idle badge and a start button when idle', async () => {
    const { props, result } = renderCard(idle, START);
    await result;
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Idle');
    await fireEvent.press(screen.getByTestId('scooter-start-7'));
    expect(props.onStart).toHaveBeenCalledWith(7);
  });

  it('sends preset minutes from the quick-add bubbles', async () => {
    const { props, result } = renderCard(idle, START);
    await result;
    await fireEvent.press(screen.getByTestId('preset-7-15'));
    await fireEvent.press(screen.getByTestId('preset-7-60'));
    expect(props.onAllocate).toHaveBeenNthCalledWith(1, 7, 15);
    expect(props.onAllocate).toHaveBeenNthCalledWith(2, 7, 60);
  });

  it('counts down and shows the auto-detected start time while riding', async () => {
    const { result } = renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 10 * MIN);
    await result;
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Riding');
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('20:00');
    expect(screen.getByText(/Started 14:05/)).toBeOnTheScreen();
  });

  it('counts up when started without an allocation', async () => {
    const { result } = renderCard({ ...idle, startedAt: START }, START + 7 * MIN + 5000);
    await result;
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('7:05');
  });

  it('flags the last minutes as ending soon', async () => {
    const { result } = renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 27 * MIN);
    await result;
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Ending soon');
  });

  it('shows overtime once the allocation runs out and can end the ride', async () => {
    const { props, result } = renderCard(
      { ...idle, startedAt: START, allocatedMinutes: 15 },
      START + 18 * MIN,
    );
    await result;
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Overtime');
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('+3:00');
    await fireEvent.press(screen.getByTestId('scooter-stop-7'));
    expect(props.onStop).toHaveBeenCalledWith(7);
  });
});
