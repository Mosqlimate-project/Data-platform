import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HomeChart from './HomeChart';

const api = vi.hoisted(() => ({
  fetchPredictionData: vi.fn(),
  fetchCases: vi.fn(),
}));

vi.mock('@/lib/dashboard/api', () => ({
  fetchPredictionData: api.fetchPredictionData,
  fetchCases: api.fetchCases,
}));

vi.mock('@/components/dashboard/QuantitativeLineChart', () => ({
  LineChart: ({ data, predictions }: any) => (
    <div
      data-testid="line-chart"
      data-labels={data.labels.length}
      data-data={data.data.length}
      data-preds={predictions.length}
    />
  ),
  Series: {},
  QuantitativePrediction: {},
}));

const baseProps = {
  predictionId: 42,
  disease: 'dengue',
  admLevel: 0 as const,
  sprint: false,
  caseDefinition: 'reported' as const,
  adm0: 'BR',
};

describe('HomeChart', () => {
  beforeEach(() => {
    api.fetchPredictionData.mockReset();
    api.fetchCases.mockReset();
  });

  it('shows the loading spinner while data is pending', () => {
    api.fetchPredictionData.mockReturnValue(new Promise(() => {}));
    render(<HomeChart {...baseProps} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('renders the chart with cases and predictions on success', async () => {
    api.fetchPredictionData.mockResolvedValue([
      { date: '2024-01-02', pred: 2, lower_95: 1, upper_95: 3, lower_50: 1.5, upper_50: 2.5 },
      { date: '2024-01-01', pred: 1, lower_95: null, upper_95: null, lower_50: null, upper_50: null },
    ]);
    api.fetchCases.mockResolvedValue([
      { date: '2024-01-01', cases: 10 },
      { date: '2024-01-02', cases: 20 },
    ]);

    render(<HomeChart {...baseProps} />);

    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
    const chart = screen.getByTestId('line-chart');
    expect(chart).toHaveAttribute('data-preds', '1');
    expect(chart).toHaveAttribute('data-data', '2');
    expect(api.fetchCases).toHaveBeenCalledWith(
      'dengue',
      0,
      false,
      'reported',
      '2024-01-01',
      '2024-01-02',
      'BR',
      undefined,
      undefined
    );
  });

  it('falls back to prediction-only labels when the cases fetch fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.fetchPredictionData.mockResolvedValue([{ date: '2024-01-01', pred: 1 }]);
    api.fetchCases.mockRejectedValue(new Error('cases down'));

    render(<HomeChart {...baseProps} />);

    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
    const chart = screen.getByTestId('line-chart');
    expect(chart).toHaveAttribute('data-labels', '1');
    expect(chart).toHaveAttribute('data-data', '0');
    expect(err).toHaveBeenCalled();
  });

  it('renders an empty chart when no prediction rows are returned', async () => {
    api.fetchPredictionData.mockResolvedValue([]);

    render(<HomeChart {...baseProps} />);

    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
    const chart = screen.getByTestId('line-chart');
    expect(chart).toHaveAttribute('data-preds', '0');
    expect(chart).toHaveAttribute('data-labels', '0');
    expect(api.fetchCases).not.toHaveBeenCalled();
  });

  it('renders an empty chart when the prediction fetch rejects', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.fetchPredictionData.mockRejectedValue(new Error('prediction down'));

    render(<HomeChart {...baseProps} />);

    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-preds', '0');
    expect(err).toHaveBeenCalled();
  });
});
