import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TERMS } from '../learn/terms';
import { Term } from '../learn/Term';
import { AnalysisProvider } from '../state/analysis';
import { useStore } from '../state/store';
import { Issues, Kpis, LossWaterfall } from './Results';

const initial = useStore.getState();
beforeEach(() => useStore.setState({ ...initial, currency: 'USD' }, true));

describe('results', () => {
  it('shows the headline numbers for the reversible template', () => {
    render(
      <AnalysisProvider>
        <Kpis />
      </AnalysisProvider>,
    );
    const kpis = screen.getByTestId('kpis');
    expect(within(kpis).getByText('26.5')).toBeInTheDocument();
    expect(within(kpis).getByText('76.2')).toBeInTheDocument();
    expect(within(kpis).getByText('4 h 57 min')).toBeInTheDocument();
  });

  it('draws the energy waterfall from grid in to grid out', () => {
    render(
      <AnalysisProvider>
        <LossWaterfall />
      </AnalysisProvider>,
    );
    expect(screen.getByText('Grid in')).toBeInTheDocument();
    expect(screen.getByText('Grid out')).toBeInTheDocument();
    expect(screen.getByText('Pipe friction (down)')).toBeInTheDocument();
  });

  it('reports a clean layout', () => {
    render(
      <AnalysisProvider>
        <Issues />
      </AnalysisProvider>,
    );
    expect(screen.getByText(/No issues/)).toBeInTheDocument();
  });

  it('tells the user what to do on an empty canvas', () => {
    useStore.getState().clear();
    render(
      <AnalysisProvider>
        <Issues />
      </AnalysisProvider>,
    );
    expect(screen.getByText(/Place an upper reservoir/)).toBeInTheDocument();
  });
});

describe('term cards', () => {
  it('open with a plain meaning and the value on the user’s own system', async () => {
    render(
      <AnalysisProvider>
        <Term id="grossHead">head</Term>
      </AnalysisProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'head' }));
    const card = screen.getByRole('dialog', { name: 'Head (gross head)' });
    expect(within(card).getByText(/height the water falls/)).toBeInTheDocument();
    expect(within(card).getByText(/Your system drops 510 m/)).toBeInTheDocument();
    expect(useStore.getState().discovered).toContain('grossHead');
  });

  it('every related term points at a term that exists', () => {
    const ids = new Set(TERMS.map((t) => t.id));
    for (const t of TERMS) for (const r of t.related ?? []) expect(ids.has(r), `${t.id} → ${r}`).toBe(true);
  });
});
