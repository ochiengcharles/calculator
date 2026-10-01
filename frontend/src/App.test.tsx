import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('SmartCalc app', () => {
  it('renders the calculator and calculates a simple expression', async () => {
    const user = userEvent.setup();
    render(<App />);

    const buttons = ['2', '+', '2'];
    for (const key of buttons) {
      await user.click(screen.getByRole('button', { name: key }));
    }

    await user.click(screen.getByRole('button', { name: 'Equals' }));
    expect(screen.getByText('4', { selector: 'div' })).toBeInTheDocument();
  });

  it('clears the display', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('0', { selector: 'div' })).toBeInTheDocument();
  });

  it('supports scientific mode and angle mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Scientific' }));
    expect(screen.getByRole('button', { name: 'sin' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'RAD' }));
    expect(screen.getByRole('button', { name: 'RAD' })).toHaveAttribute('data-active', 'true');
  });
});
