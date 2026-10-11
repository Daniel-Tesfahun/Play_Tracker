import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { Zone } from '@/db/types';
import { applyIncrement } from '@/lib/gaming';

import { ZoneCard } from '../gaming/ZoneCard';

const baseZone: Zone = {
  id: 1,
  name: 'Zone 1',
  currentGame: 'EA FC 26',
  position: 1,
  gamesToday: 0,
  players: [],
  unassignedToday: 0,
};

const withPlayers: Zone = {
  ...baseZone,
  gamesToday: 3,
  unassignedToday: 0,
  players: [
    { id: 10, zoneId: 1, name: 'Abel', position: 1, gamesToday: 2 },
    { id: 11, zoneId: 1, name: 'Sami', position: 2, gamesToday: 1 },
  ],
};

const noop = () => {};

/** Wires the card to the same optimistic logic the screen uses. */
function Harness({
  initial = baseZone,
  onEdit = jest.fn(),
  onReset = jest.fn(),
  onUndo = jest.fn(),
  onAddPlayer = jest.fn(),
  onToggleCollapse = jest.fn(),
  onLongPressSelect = jest.fn(),
}: {
  onLongPressSelect?: (id: number) => void;
  initial?: Zone;
  onToggleCollapse?: (id: number) => void;
  onEdit?: (z: Zone) => void;
  onReset?: (z: Zone) => void;
  onUndo?: (id: number) => void;
  onAddPlayer?: (z: Zone) => void;
}) {
  const [zones, setZones] = useState([initial]);
  return (
    <ZoneCard
      zone={zones[0]!}
      share={0}
      onIncrement={(id, playerId = null) => setZones((prev) => applyIncrement(prev, id, 1, playerId))}
      onDecrementPlayer={(id, playerId) => setZones((prev) => applyIncrement(prev, id, -1, playerId))}
      onUndo={onUndo}
      onReset={onReset}
      onAddPlayer={onAddPlayer}
      onToggleCollapse={onToggleCollapse}
      onLongPressSelect={onLongPressSelect}
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

  it('adds games only with the +1 button', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId('zone-plus-1'));
    await fireEvent.press(screen.getByTestId('zone-plus-1'));
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('2');
  });

  it('tapping the header collapses/expands and never adds a game', async () => {
    const onToggleCollapse = jest.fn();
    await render(<Harness onToggleCollapse={onToggleCollapse} />);

    await fireEvent.press(screen.getByTestId('zone-header-1'));
    await fireEvent.press(screen.getByTestId('zone-header-1'));

    expect(onToggleCollapse).toHaveBeenCalledTimes(2);
    expect(onToggleCollapse).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('0');
  });

  it('press-and-hold on the header starts selecting this station', async () => {
    const onLongPressSelect = jest.fn();
    const onEdit = jest.fn();
    await render(<Harness onLongPressSelect={onLongPressSelect} onEdit={onEdit} />);

    await fireEvent(screen.getByTestId('zone-header-1'), 'longPress');

    expect(onLongPressSelect).toHaveBeenCalledWith(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('0');
  });

  it('opens edit from the ⋯ button without toggling the card', async () => {
    const onEdit = jest.fn();
    const onToggleCollapse = jest.fn();
    await render(<Harness onEdit={onEdit} onToggleCollapse={onToggleCollapse} />);
    await fireEvent.press(screen.getByTestId('zone-edit-1'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onToggleCollapse).not.toHaveBeenCalled();
  });

  it('tapping non-button parts of a collapsed header toggles it; its +1 does not', async () => {
    const onToggleCollapse = jest.fn();
    const onIncrement = jest.fn();
    await render(
      <ZoneCard
        zone={baseZone}
        share={0}
        collapsed
        onToggleCollapse={onToggleCollapse}
        onIncrement={onIncrement}
        onDecrementPlayer={noop}
        onUndo={noop}
        onReset={noop}
        onAddPlayer={noop}
        onEdit={noop}
      />,
    );
    await fireEvent.press(screen.getByTestId('zone-count-1'));
    await fireEvent.press(screen.getByText('Zone 1'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByTestId('zone-plus-1'));
    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);
  });

  it('exposes reset and undo right on the card', async () => {
    const onReset = jest.fn();
    const onUndo = jest.fn();
    await render(<Harness initial={withPlayers} onReset={onReset} onUndo={onUndo} />);

    await fireEvent.press(screen.getByTestId('zone-reset-1'));
    await fireEvent.press(screen.getByTestId('zone-undo-1'));

    expect(onReset).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onUndo).toHaveBeenCalledWith(1);
    // Neither should count as a game.
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('3');
  });

  it('lists players with their own counts', async () => {
    await render(<Harness initial={withPlayers} />);
    expect(screen.getByText('Abel')).toBeOnTheScreen();
    expect(screen.getByText('Sami')).toBeOnTheScreen();
    expect(screen.getByTestId('player-count-10')).toHaveTextContent('2');
    expect(screen.getByTestId('player-count-11')).toHaveTextContent('1');
  });

  it("player buttons change that player's count and the zone total", async () => {
    await render(<Harness initial={withPlayers} />);

    await fireEvent.press(screen.getByTestId('player-plus-11'));
    await fireEvent.press(screen.getByTestId('player-plus-11'));
    expect(screen.getByTestId('player-count-11')).toHaveTextContent('3');
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('5');

    await fireEvent.press(screen.getByTestId('player-minus-10'));
    expect(screen.getByTestId('player-count-10')).toHaveTextContent('1');
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('4');
  });

  it('shows games not credited to a player (e.g. from a removed player)', async () => {
    await render(<Harness initial={{ ...withPlayers, gamesToday: 4, unassignedToday: 1 }} />);
    expect(screen.getByText('1 game not credited to a player')).toBeOnTheScreen();
  });

  it('hides the station +1 once the station has players', async () => {
    await render(<Harness initial={withPlayers} />);
    expect(screen.queryByTestId('zone-plus-1')).toBeNull();
    // Games go through the players instead.
    await fireEvent.press(screen.getByTestId('player-plus-10'));
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('4');
  });

  it('brings the station +1 back when there are no players', async () => {
    await render(<Harness initial={{ ...withPlayers, players: [], unassignedToday: 3 }} />);
    expect(screen.getByTestId('zone-plus-1')).toBeOnTheScreen();
  });

  it('offers to add players, labelled as optional when there are none', async () => {
    const onAddPlayer = jest.fn();
    await render(<Harness onAddPlayer={onAddPlayer} />);
    expect(screen.getByText('Add players (optional)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('zone-add-player-1'));
    expect(onAddPlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('labels the card for screen readers', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Zone 1, 0 games today')).toBeOnTheScreen();
  });

  it('collapses to a compact row that can still log games', async () => {
    const onToggleCollapse = jest.fn();
    await render(
      <ZoneCard
        zone={withPlayers}
        share={0}
        collapsed
        onToggleCollapse={onToggleCollapse}
        onIncrement={noop}
        onDecrementPlayer={noop}
        onUndo={noop}
        onReset={noop}
        onAddPlayer={noop}
        onEdit={noop}
      />,
    );
    // Count and the player summary stay; with players, a players chip replaces +1.
    expect(screen.getByTestId('zone-count-1')).toHaveTextContent('3');
    expect(screen.queryByTestId('zone-plus-1')).toBeNull();
    expect(screen.getByText('EA FC 26 · 2 players')).toBeOnTheScreen();
    expect(screen.queryByTestId('player-row-10')).toBeNull();
    expect(screen.queryByTestId('zone-undo-1')).toBeNull();

    await fireEvent.press(screen.getByTestId('zone-collapse-1'));
    expect(onToggleCollapse).toHaveBeenCalledWith(1);

    // The chip opens the card so a player can be picked.
    await fireEvent.press(screen.getByTestId('zone-players-chip-1'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);
  });

  it('keeps the quick +1 on a collapsed station without players', async () => {
    const onIncrement = jest.fn();
    await render(
      <ZoneCard
        zone={baseZone}
        share={0}
        collapsed
        onToggleCollapse={noop}
        onIncrement={onIncrement}
        onDecrementPlayer={noop}
        onUndo={noop}
        onReset={noop}
        onAddPlayer={noop}
        onEdit={noop}
      />,
    );
    await fireEvent.press(screen.getByTestId('zone-plus-1'));
    expect(onIncrement).toHaveBeenCalledWith(1);
    expect(screen.queryByTestId('zone-players-chip-1')).toBeNull();
  });

  it('labels the collapse button for screen readers', async () => {
    await render(
      <ZoneCard
        zone={baseZone}
        share={0}
        onToggleCollapse={noop}
        onIncrement={noop}
        onDecrementPlayer={noop}
        onUndo={noop}
        onReset={noop}
        onAddPlayer={noop}
        onEdit={noop}
      />,
    );
    expect(screen.getByLabelText('Collapse Zone 1')).toBeOnTheScreen();
  });

  it('falls back when no game title is set', async () => {
    await render(
      <ZoneCard
        zone={{ ...baseZone, currentGame: null }}
        share={0}
        onIncrement={noop}
        onDecrementPlayer={noop}
        onUndo={noop}
        onReset={noop}
        onAddPlayer={noop}
        onEdit={noop}
      />,
    );
    expect(screen.getByText('No game set')).toBeOnTheScreen();
  });
});
