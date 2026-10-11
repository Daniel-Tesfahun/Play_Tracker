import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Scooter } from '@/db/types';
import type { ClockPrefs } from '@/lib/time';

import { ScooterCard } from '../scooters/ScooterCard';

const MIN = 60_000;
const START = new Date(2026, 9, 10, 14, 5).getTime();
const H24: ClockPrefs = { locale: 'en-GB', hour12: false };

const idle: Scooter = {
  id: 7,
  name: 'Scooter 7',
  startedAt: null,
  allocatedMinutes: 0,
  pausedAt: null,
  pausedMs: 0,
  position: 1,
};

async function renderCard(
  scooter: Scooter,
  now: number,
  clock: ClockPrefs = H24,
  extra: { collapsed?: boolean; onToggleCollapse?: (id: number) => void; onLongPressSelect?: (id: number) => void } = {},
) {
  const props = {
    onAllocate: jest.fn(),
    onClearAllocation: jest.fn(),
    onStart: jest.fn(),
    onStop: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onCustomMinutes: jest.fn(),
    onReset: jest.fn(),
    onEdit: jest.fn(),
  };
  await render(<ScooterCard scooter={scooter} now={now} clock={clock} {...extra} {...props} />);
  return props;
}

describe('ScooterCard', () => {
  it('shows an idle badge, "Ready", and a start button when idle', async () => {
    const props = await renderCard(idle, START);
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Idle');
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('Ready');
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

  it('previews booked time before the ride starts', async () => {
    await renderCard({ ...idle, allocatedMinutes: 45 }, START);
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('45:00');
    expect(screen.getByTestId('scooter-caption-7')).toHaveTextContent(/45m booked/);
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

  it('collapses to name, status, live time, and one start/end action', async () => {
    const onToggleCollapse = jest.fn();
    const props = await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 10 * MIN, H24, {
      collapsed: true,
      onToggleCollapse,
    });
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Riding');
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('20:00');
    expect(screen.queryByTestId('timer-progress')).toBeNull();
    expect(screen.queryByTestId('preset-7-15')).toBeNull();

    await fireEvent.press(screen.getByTestId('scooter-stop-7'));
    expect(props.onStop).toHaveBeenCalledWith(7);
    await fireEvent.press(screen.getByTestId('scooter-collapse-7'));
    expect(onToggleCollapse).toHaveBeenCalledWith(7);
  });

  it('starts a ride from the collapsed row', async () => {
    const props = await renderCard(idle, START, H24, { collapsed: true, onToggleCollapse: jest.fn() });
    await fireEvent.press(screen.getByTestId('scooter-start-7'));
    expect(props.onStart).toHaveBeenCalledWith(7);
  });

  it('pauses a running ride', async () => {
    const props = await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 5 * MIN);
    await fireEvent.press(screen.getByTestId('scooter-pause-7'));
    expect(props.onPause).toHaveBeenCalledWith(7);
    expect(screen.queryByTestId('scooter-resume-7')).toBeNull();
  });

  it('shows a paused ride frozen, with Resume', async () => {
    const paused = { ...idle, startedAt: START, allocatedMinutes: 30, pausedAt: START + 10 * MIN };
    const props = await renderCard(paused, START + 40 * MIN);
    expect(screen.getByTestId('scooter-badge-7')).toHaveTextContent('Paused');
    // Frozen at the 10-minute mark: 20 minutes still left, not overtime.
    expect(screen.getByTestId('scooter-time-7')).toHaveTextContent('20:00');
    expect(screen.getByTestId('scooter-caption-7')).toHaveTextContent(/Paused at 14:15/);
    expect(screen.getByText('On hold')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('scooter-resume-7'));
    expect(props.onResume).toHaveBeenCalledWith(7);
  });

  it('pushes the end time back by the time spent paused', async () => {
    await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30, pausedMs: 10 * MIN }, START + 20 * MIN);
    // 14:05 start + 30 min ride + 10 min paused.
    expect(screen.getByText('Ends 14:45')).toBeOnTheScreen();
  });

  it('opens the custom minutes sheet from the keypad bubble', async () => {
    const props = await renderCard(idle, START);
    await fireEvent.press(screen.getByTestId('preset-custom-7'));
    expect(props.onCustomMinutes).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('offers pause in the collapsed row too', async () => {
    const props = await renderCard({ ...idle, startedAt: START }, START + MIN, H24, {
      collapsed: true,
      onToggleCollapse: jest.fn(),
    });
    await fireEvent.press(screen.getByTestId('scooter-pause-7'));
    expect(props.onPause).toHaveBeenCalledWith(7);
  });

  it('tapping the header toggles collapse; press-and-hold starts selecting', async () => {
    const onToggleCollapse = jest.fn();
    const onLongPressSelect = jest.fn();
    const props = await renderCard({ ...idle, startedAt: START }, START + MIN, H24, {
      onToggleCollapse,
      onLongPressSelect,
    });

    await fireEvent.press(screen.getByTestId('scooter-header-7'));
    expect(onToggleCollapse).toHaveBeenCalledWith(7);
    expect(props.onStart).not.toHaveBeenCalled();
    expect(props.onStop).not.toHaveBeenCalled();

    await fireEvent(screen.getByTestId('scooter-header-7'), 'longPress');
    expect(onLongPressSelect).toHaveBeenCalledWith(7);
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('collapsed: tapping the live time or name toggles; the row buttons do their own thing', async () => {
    const onToggleCollapse = jest.fn();
    const props = await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + MIN, H24, {
      collapsed: true,
      onToggleCollapse,
    });

    await fireEvent.press(screen.getByTestId('scooter-time-7'));
    await fireEvent.press(screen.getByText('Scooter 7'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByTestId('scooter-pause-7'));
    await fireEvent.press(screen.getByTestId('scooter-stop-7'));
    expect(props.onPause).toHaveBeenCalledWith(7);
    expect(props.onStop).toHaveBeenCalledWith(7);
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);
  });

  it('opens edit from the ⋯ button', async () => {
    const props = await renderCard(idle, START, H24, { onToggleCollapse: jest.fn() });
    await fireEvent.press(screen.getByTestId('scooter-edit-7'));
    expect(props.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('collapsed and riding: badge and live time share the line under the name', async () => {
    await renderCard({ ...idle, startedAt: START, allocatedMinutes: 30 }, START + 10 * MIN, H24, {
      collapsed: true,
      onToggleCollapse: jest.fn(),
    });
    const badge = screen.getByTestId('scooter-badge-7');
    const time = screen.getByTestId('scooter-time-7');
    expect(badge).toHaveTextContent('Riding');
    expect(time).toHaveTextContent('20:00');
    // Same row container: badge and time are siblings under the name, not crammed beside the buttons.
    const badgeRow = badge.parent?.parent?.parent;
    expect(badgeRow?.children).toContain(time);
  });
});
