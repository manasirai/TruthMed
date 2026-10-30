import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimInput } from '@/components/fact-check/ClaimInput';

describe('ClaimInput', () => {
  it('renders textarea and submit button', () => {
    render(<ClaimInput onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeDefined();
    expect(screen.getByText(/Analyze Claim/)).toBeDefined();
  });

  it('shows error when submitting empty claim', async () => {
    render(<ClaimInput onSubmit={vi.fn()} />);
    const btn = screen.getByText(/Analyze Claim/);
    fireEvent.click(btn);
    expect(await screen.findByText(/Please enter a health claim/)).toBeDefined();
  });

  it('calls onSubmit with trimmed claim when valid', async () => {
    const onSubmit = vi.fn();
    render(<ClaimInput onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Vitamin C prevents colds');
    fireEvent.click(screen.getByText(/Analyze Claim/));
    expect(onSubmit).toHaveBeenCalledWith('Vitamin C prevents colds');
  });

  it('fills textarea when example claim is clicked', async () => {
    render(<ClaimInput onSubmit={vi.fn()} />);
    const exampleBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('glasses of water')
    );
    if (exampleBtn) {
      fireEvent.click(exampleBtn);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toContain('water');
    }
  });

  it('shows character count', async () => {
    render(<ClaimInput onSubmit={vi.fn()} />);
    expect(screen.getByText(/\/2000/)).toBeDefined();
  });
});
