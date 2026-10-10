import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { Zone } from '@/db/types';
import { applyIncrement } from '@/lib/gaming';

import { ZoneCard } from '../gaming/ZoneCard';

const baseZone: Zone = { id: 1, name: 'Zone 1', currentGame: 'EA FC 26', position: 1, gamesToday: 0 };

/** Wires the card to the same optimistic increment the screen uses. */
function Harness({ onEdit = jest.fn() }: { onEdit?: (z: Zone) => void }) {
  const [zones, setZones] = useState([baseZone]);
  const zone = zones[0]!;
  return (
    <ZoneCard
      zone={zone}
      share={0}
      onIncrement={(id) => setZones((prev) => applyIncrement(prev, id))}
      onEdit={onEdit}
    />
  );
}

describe('ZoneCard', () => {
  it('shows the zone name, count, and current game', async () => {
    await render(<Harness />);
    expect(screen.getByText('Zone 1')).toBeOnTheScreen();
    expect(screen.getByText('EA FC 26')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('0');
  });

  it('increments the game count on each tap', async () => {
    await render(<Harness />);
    const card = screen.getByTestId('zone-card-1');
    await fireEvent.press(card);
    await fireEvent.press(card);
    await fireEvent.press(card);
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('3');
  });

  it('opens edit on long press and via the edit button without counting a game', async () => {
    const onEdit = jest.fn();
    await render(<Harness onEdit={onEdit} />);

    await fireEvent(screen.getByTestId('zone-card-1'), 'longPress');
    await fireEvent.press(screen.getByTestId('zone-edit-1'));

    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('0');
  });

  it('labels the card for screen readers', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Zone 1, 0 games today')).toBeOnTheScreen();
  });

  it('falls back when no game title is set', async () => {
    await render(
      <ZoneCard zone={{ ...baseZone, currentGame: null }} share={0} onIncrement={jest.fn()} onEdit={jest.fn()} />,
    );
    expect(screen.getByText('No game set')).toBeOnTheScreen();
  });
});
