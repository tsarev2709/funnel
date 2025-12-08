import { describe, expect, it } from 'vitest';
import { calculateSummary, createInitialState } from './CalculatorPage.jsx';

describe('calculateSummary', () => {
  it('returns zero total when duration and selections are empty', () => {
    const defaults = createInitialState();
    const summary = calculateSummary({
      productTypeId: defaults.productTypeId,
      speedId: defaults.speedId,
      durationSeconds: 0,
      creativeCount: 1,
      selectedFormats: [],
      selectedServices: [],
      voiceoverType: defaults.voiceoverType,
      revisionIterations: defaults.revisionIterations,
    });

    expect(summary.totals.totalCost).toBe(0);
    expect(summary.costBreakdown.base).toBe(0);
    expect(summary.costBreakdown.services).toBe(0);
    expect(summary.costBreakdown.formats).toBe(0);
  });

  it('adds base, service, and format costs together', () => {
    const defaults = createInitialState();
    const summary = calculateSummary({
      productTypeId: 'single',
      speedId: defaults.speedId,
      durationSeconds: 60,
      creativeCount: 1,
      selectedFormats: ['vertical'],
      selectedServices: ['marketing'],
      voiceoverType: defaults.voiceoverType,
      revisionIterations: defaults.revisionIterations,
    });

    expect(summary.costBreakdown.base).toBe(227500);
    expect(summary.costBreakdown.services).toBe(84500);
    expect(summary.costBreakdown.formats).toBe(2600);
    expect(summary.totals.totalCost).toBe(314600);
  });
});
