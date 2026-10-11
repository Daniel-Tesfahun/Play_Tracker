import { fireEvent, render, screen } from '@testing-library/react-native';

import { SectionCard } from '../navigation/SectionCard';
import { SECTIONS } from '../navigation/sections';

describe('SectionCard', () => {
  it('shows the section name, description, and live stats', async () => {
    await render(
      <SectionCard
        section={SECTIONS.ps}
        stats={[
          { label: 'Games today', value: '12' },
          { label: 'Active', value: '3/6' },
        ]}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('PS')).toBeOnTheScreen();
    expect(screen.getByText(SECTIONS.ps.description)).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('3/6')).toBeOnTheScreen();
  });

  it('opens the section when tapped', async () => {
    const onOpen = jest.fn();
    await render(
      <SectionCard section={SECTIONS.scooters} stats={[{ label: 'Riding now', value: '1/4' }]} onOpen={onOpen} />,
    );
    await fireEvent.press(screen.getByTestId('section-card-scooters'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('reads its stats to screen readers', async () => {
    await render(
      <SectionCard section={SECTIONS.scooters} stats={[{ label: 'Riding now', value: '1/4' }]} onOpen={jest.fn()} />,
    );
    expect(screen.getByLabelText('Open Scooters. Riding now 1/4')).toBeOnTheScreen();
  });
});

describe('SECTIONS', () => {
  it('links each section to its own route', () => {
    expect(SECTIONS.ps.href).toBe('/ps');
    expect(SECTIONS.scooters.href).toBe('/scooters');
  });
});
