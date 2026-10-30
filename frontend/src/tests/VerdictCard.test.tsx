import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerdictCard } from '@/components/fact-check/VerdictCard';

describe('VerdictCard', () => {
  it('renders verdict label and short answer', () => {
    render(
      <VerdictCard
        verdict="supported"
        verdictLabel="Supported by Evidence"
        shortAnswer="This claim is well supported by multiple clinical trials."
      />
    );
    expect(screen.getByText('Supported by Evidence')).toBeDefined();
    expect(screen.getByText(/well supported/)).toBeDefined();
  });

  it('renders misleading verdict with correct label', () => {
    render(
      <VerdictCard
        verdict="misleading"
        verdictLabel="Misleading or Missing Context"
        shortAnswer="The claim oversimplifies a complex topic."
      />
    );
    expect(screen.getByText('Misleading or Missing Context')).toBeDefined();
  });

  it('renders insufficient evidence verdict', () => {
    render(
      <VerdictCard
        verdict="insufficient_evidence"
        verdictLabel="Insufficient Evidence"
        shortAnswer="There is not enough research to draw a conclusion."
      />
    );
    expect(screen.getByText('Insufficient Evidence')).toBeDefined();
  });
});
