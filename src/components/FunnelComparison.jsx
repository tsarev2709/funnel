import { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import {
  calculateMetrics,
  fallbackScenario,
  getScenarioMeta,
  normalizeState,
} from '../utils/funnel.js';

function pickWinner(leftValue, rightValue, { lowerIsBetter = false, tolerance = 0.05 } = {}) {
  const left = typeof leftValue === 'number' ? leftValue : null;
  const right = typeof rightValue === 'number' ? rightValue : null;
  if (left == null && right == null) return 'tie';
  if (left == null) return 'right';
  if (right == null) return 'left';
  const diff = left - right;
  const scale = Math.max(Math.abs(left), Math.abs(right), 1);
  if (Math.abs(diff) <= scale * tolerance) {
    return 'tie';
  }
  if (lowerIsBetter) {
    return left < right ? 'left' : 'right';
  }
  return left > right ? 'left' : 'right';
}

function evaluateFunnel(funnel) {
  if (!funnel) return null;
  const { state, metrics } = funnel;
  const stages = state.stages ?? [];
  const tasksCount = stages.reduce((sum, stage) => sum + (stage.tasks?.length ?? 0), 0);
  const leversCount = state.levers?.length ?? 0;
  const stagesCount = stages.length;
  const complexity = stagesCount + leversCount * 1.6 + tasksCount * 0.25;
  const cost = metrics.spendImproved ?? metrics.spendBase ?? 0;
  const budgetShare = metrics.marketingBudgetShare ?? 0;
  const result = metrics.revenueImproved ?? 0;
  const deltaPercent = metrics.deltaPercent ?? 0;
  const speed = metrics.paybackMonths ?? 0;
  const roi = metrics.roiImproved ?? 0;
  const churn = metrics.churnRateImproved ?? metrics.churnRate ?? 0;
  const playsCount = metrics.scenarioPlays?.length ?? 0;
  const confidence = Math.max(1, Math.min(10, 5 + roi / 40 + playsCount * 0.5 - churn / 25));
  return {
    label: funnel.label,
    scenarioName: funnel.scenario?.name ?? '',
    stagesCount,
    leversCount,
    tasksCount,
    complexity,
    cost,
    budgetShare,
    result,
    deltaPercent,
    speed,
    roi,
    churn,
    confidence,
    metrics,
  };
}

function buildSummary(left, right, formatters, strings) {
  if (!left || !right) return [];
  const items = [
    {
      id: 'cost',
      label: strings.summaryCost,
      winner: pickWinner(left.cost, right.cost, { lowerIsBetter: true, tolerance: 0.07 }),
      leftText: `${formatters.money(left.cost)} · ${formatters.share(left.budgetShare)}`,
      rightText: `${formatters.money(right.cost)} · ${formatters.share(right.budgetShare)}`,
    },
    {
      id: 'ease',
      label: strings.summaryEase,
      winner: pickWinner(left.complexity, right.complexity, { lowerIsBetter: true, tolerance: 0.08 }),
      leftText: `${strings.complexityLabel}: ${formatters.index(left.complexity)} · ${strings.statsStages}: ${left.stagesCount}`,
      rightText: `${strings.complexityLabel}: ${formatters.index(right.complexity)} · ${strings.statsStages}: ${right.stagesCount}`,
    },
    {
      id: 'result',
      label: strings.summaryResult,
      winner: pickWinner(left.result, right.result, { lowerIsBetter: false, tolerance: 0.05 }),
      leftText: `${formatters.money(left.result)} · Δ ${formatters.percentValue(left.deltaPercent)}`,
      rightText: `${formatters.money(right.result)} · Δ ${formatters.percentValue(right.deltaPercent)}`,
    },
    {
      id: 'speed',
      label: strings.summarySpeed,
      winner: pickWinner(left.speed, right.speed, { lowerIsBetter: true, tolerance: 0.1 }),
      leftText: formatters.months(left.speed),
      rightText: formatters.months(right.speed),
    },
    {
      id: 'confidence',
      label: strings.summaryConfidence,
      winner: pickWinner(left.confidence, right.confidence, { lowerIsBetter: false, tolerance: 0.05 }),
      leftText: `${strings.confidenceLabel}: ${formatters.index(left.confidence)}${strings.confidenceUnit}`,
      rightText: `${strings.confidenceLabel}: ${formatters.index(right.confidence)}${strings.confidenceUnit}`,
    },
  ];

  return items.map((item) => {
    if (item.winner === 'tie') {
      return { ...item, description: strings.summaryTie };
    }
    const winnerLabel = item.winner === 'left' ? left.label : right.label;
    const loserLabel = item.winner === 'left' ? right.label : left.label;
    const winnerValue = item.winner === 'left' ? item.leftText : item.rightText;
    const loserValue = item.winner === 'left' ? item.rightText : item.leftText;
    return {
      ...item,
      description: `${winnerLabel} ${strings.winnerPrefix} • ${winnerValue} ${strings.versus} ${loserLabel}: ${loserValue}`,
    };
  });
}

function FunnelComparison({ presets, currentState, locale, strings, onExit }) {
  const safeLocale = locale ?? 'ru-RU';

  const numberFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(safeLocale, { maximumFractionDigits: 0 });
    } catch (error) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
    }
  }, [safeLocale]);

  const decimalFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(safeLocale, { maximumFractionDigits: 1 });
    } catch (error) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
    }
  }, [safeLocale]);

  const percentFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(safeLocale, { style: 'percent', maximumFractionDigits: 1 });
    } catch (error) {
      return new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 });
    }
  }, [safeLocale]);

  const insightFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(safeLocale, { maximumFractionDigits: 1 });
    } catch (error) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
    }
  }, [safeLocale]);

  const formatters = useMemo(
    () => ({
      money: (value) => `${numberFormatter.format(Math.round(value ?? 0))}${strings.currencySuffix ? ` ${strings.currencySuffix}` : ''}`,
      share: (value) => percentFormatter.format(Math.max(0, value ?? 0)),
      percentValue: (value) => `${decimalFormatter.format(value ?? 0)}%`,
      months: (value) => (value != null && value <= 0.2 ? strings.immediate : `${decimalFormatter.format(Math.max(0, value ?? 0))} ${strings.monthShort}`),
      index: (value) => decimalFormatter.format(Math.max(0, value ?? 0)),
    }),
    [decimalFormatter, numberFormatter, percentFormatter, strings.currencySuffix, strings.immediate, strings.monthShort],
  );

  const buildFunnel = (raw, label, source) => {
    if (!raw) return null;
    try {
      const normalized = normalizeState(raw);
      const scenario = normalized.scenarios?.[0] ?? fallbackScenario;
      const meta = getScenarioMeta(scenario, normalized.trafficChannels);
      const metrics = calculateMetrics({
        state: normalized,
        scenario,
        scenarioMeta: meta,
        activeLevers: new Set(),
        numberFormatter: insightFormatter,
      });
      return {
        label: label && label.trim() ? label : normalized.name || strings.unknownName,
        state: normalized,
        scenario,
        scenarioMeta: meta,
        metrics,
        source,
      };
    } catch (error) {
      console.error('Failed to build funnel for comparison', error);
      return null;
    }
  };

  const [leftFunnel, setLeftFunnel] = useState(() => buildFunnel(currentState, strings.currentFunnelLabel, 'current'));
  const [rightFunnel, setRightFunnel] = useState(null);
  const [leftPresetId, setLeftPresetId] = useState('');
  const [rightPresetId, setRightPresetId] = useState('');
  const [leftError, setLeftError] = useState(null);
  const [rightError, setRightError] = useState(null);

  useEffect(() => {
    setLeftFunnel((prev) => (prev ? buildFunnel(prev.state, prev.label, prev.source) : prev));
    setRightFunnel((prev) => (prev ? buildFunnel(prev.state, prev.label, prev.source) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightFormatter]);

  const handlePresetChange = (side, presetId) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      if (side === 'left') {
        setLeftPresetId('');
      } else {
        setRightPresetId('');
      }
      return;
    }
    const funnel = buildFunnel(preset, preset.name, 'preset');
    if (side === 'left') {
      setLeftPresetId(presetId);
      setLeftFunnel(funnel);
      setLeftError(null);
    } else {
      setRightPresetId(presetId);
      setRightFunnel(funnel);
      setRightError(null);
    }
  };

  const handleUseCurrent = (side) => {
    const funnel = buildFunnel(currentState, strings.currentFunnelLabel, 'current');
    if (side === 'left') {
      setLeftFunnel(funnel);
      setLeftPresetId('');
      setLeftError(null);
    } else {
      setRightFunnel(funnel);
      setRightPresetId('');
      setRightError(null);
    }
  };

  const handleFileImport = (side, file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result ?? '{}');
        const funnel = buildFunnel(parsed, file.name.replace(/\.json$/i, ''), 'file');
        if (!funnel) {
          throw new Error('invalid funnel');
        }
        if (side === 'left') {
          setLeftFunnel(funnel);
          setLeftPresetId('');
          setLeftError(null);
        } else {
          setRightFunnel(funnel);
          setRightPresetId('');
          setRightError(null);
        }
      } catch (error) {
        if (side === 'left') {
          setLeftError(strings.fileError);
        } else {
          setRightError(strings.fileError);
        }
      }
    };
    reader.onerror = () => {
      if (side === 'left') {
        setLeftError(strings.fileError);
      } else {
        setRightError(strings.fileError);
      }
    };
    reader.readAsText(file);
  };

  const leftEval = useMemo(() => evaluateFunnel(leftFunnel), [leftFunnel]);
  const rightEval = useMemo(() => evaluateFunnel(rightFunnel), [rightFunnel]);
  const summaryItems = useMemo(() => buildSummary(leftEval, rightEval, formatters, strings), [leftEval, rightEval, formatters, strings]);

  const renderSelector = (side, funnel, presetId, setPresetId, error, onSelect, onUse, onImport) => (
    <div className="card-animated rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{side === 'left' ? strings.leftLabel : strings.rightLabel}</h3>
          <p className="text-sm text-slate-400">{funnel?.label ?? strings.unknownName}</p>
        </div>
        <button
          type="button"
          onClick={() => onUse(side)}
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
        >
          {strings.useCurrent}
        </button>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-slate-300">{strings.selectPreset}</span>
          <select
            value={presetId}
            onChange={(event) => {
              const value = event.target.value;
              setPresetId(value);
              onSelect(side, value);
            }}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
          >
            <option value="">{strings.selectPresetPlaceholder}</option>
            {presets.map((preset) => (
              <option key={`${side}-${preset.id}`} value={preset.id}>
                {preset.logo ?? '•'} {preset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-700/80 bg-slate-900 px-3 py-2 text-xs text-slate-200">
          <span className="flex items-center gap-2">
            <ArrowUpTrayIcon className="h-4 w-4" /> {strings.importLabel}
          </span>
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImport(side, file);
                event.target.value = '';
              }
            }}
          />
        </label>
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        {funnel ? (
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              <dt className="text-slate-500">{strings.statsStages}</dt>
              <dd className="font-medium text-slate-100">{funnel.state.stages?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{strings.statsLevers}</dt>
              <dd className="font-medium text-slate-100">{funnel.state.levers?.length ?? 0}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );

  const renderStatsCard = (evalData) => (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow shadow-slate-950/40">
      <div className="flex flex-col gap-1">
        <h4 className="text-lg font-semibold text-slate-100">{evalData.label}</h4>
        {evalData.scenarioName ? (
          <p className="text-xs text-slate-400">{evalData.scenarioName}</p>
        ) : null}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <div>
          <dt className="text-slate-500">{strings.statsStages}</dt>
          <dd className="font-medium text-slate-100">{evalData.stagesCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsLevers}</dt>
          <dd className="font-medium text-slate-100">{evalData.leversCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsTasks}</dt>
          <dd className="font-medium text-slate-100">{evalData.tasksCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.complexityLabel}</dt>
          <dd className="font-medium text-slate-100">{formatters.index(evalData.complexity)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsBudgetShare}</dt>
          <dd className="font-medium text-slate-100">{formatters.share(evalData.budgetShare)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsSpend}</dt>
          <dd className="font-medium text-slate-100">{formatters.money(evalData.metrics.spendImproved ?? evalData.metrics.spendBase)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsROI}</dt>
          <dd className="font-medium text-slate-100">{formatters.percentValue(evalData.roi)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsPayback}</dt>
          <dd className="font-medium text-slate-100">{formatters.months(evalData.speed)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.statsRevenue}</dt>
          <dd className="font-medium text-slate-100">{formatters.money(evalData.result)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{strings.confidenceLabel}</dt>
          <dd className="font-medium text-slate-100">{`${formatters.index(evalData.confidence)}${strings.confidenceUnit}`}</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">{strings.title}</h2>
          <p className="text-sm text-slate-400">{strings.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          {strings.backToBuilder}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderSelector('left', leftFunnel, leftPresetId, setLeftPresetId, leftError, handlePresetChange, handleUseCurrent, handleFileImport)}
        {renderSelector('right', rightFunnel, rightPresetId, setRightPresetId, rightError, handlePresetChange, handleUseCurrent, handleFileImport)}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow shadow-slate-950/40">
        <h3 className="text-lg font-semibold text-slate-100">{strings.summaryTitle}</h3>
        {summaryItems.length ? (
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {summaryItems.map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-200">
                  <span className="text-sm font-medium text-slate-100">{item.label}</span>
                  <span className="text-xs text-slate-400">{item.winner === 'tie' ? '≈' : item.winner === 'left' ? strings.leftLabel : strings.rightLabel}</span>
                </div>
                <p className="mt-2 text-xs text-slate-300">{item.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">{strings.missingData}</p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">{strings.statsTitle}</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {leftEval ? renderStatsCard(leftEval) : null}
          {rightEval ? renderStatsCard(rightEval) : null}
        </div>
      </div>
    </section>
  );
}

FunnelComparison.propTypes = {
  presets: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    logo: PropTypes.string,
  })).isRequired,
  currentState: PropTypes.object.isRequired,
  locale: PropTypes.string,
  strings: PropTypes.shape({
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    backToBuilder: PropTypes.string.isRequired,
    leftLabel: PropTypes.string.isRequired,
    rightLabel: PropTypes.string.isRequired,
    selectPreset: PropTypes.string.isRequired,
    selectPresetPlaceholder: PropTypes.string.isRequired,
    useCurrent: PropTypes.string.isRequired,
    importLabel: PropTypes.string.isRequired,
    summaryTitle: PropTypes.string.isRequired,
    missingData: PropTypes.string.isRequired,
    summaryCost: PropTypes.string.isRequired,
    summaryEase: PropTypes.string.isRequired,
    summaryResult: PropTypes.string.isRequired,
    summarySpeed: PropTypes.string.isRequired,
    summaryConfidence: PropTypes.string.isRequired,
    summaryTie: PropTypes.string.isRequired,
    winnerPrefix: PropTypes.string.isRequired,
    versus: PropTypes.string.isRequired,
    currencySuffix: PropTypes.string,
    monthShort: PropTypes.string.isRequired,
    immediate: PropTypes.string.isRequired,
    confidenceLabel: PropTypes.string.isRequired,
    confidenceUnit: PropTypes.string.isRequired,
    statsTitle: PropTypes.string.isRequired,
    statsStages: PropTypes.string.isRequired,
    statsLevers: PropTypes.string.isRequired,
    statsTasks: PropTypes.string.isRequired,
    statsBudgetShare: PropTypes.string.isRequired,
    statsSpend: PropTypes.string.isRequired,
    statsROI: PropTypes.string.isRequired,
    statsPayback: PropTypes.string.isRequired,
    statsRevenue: PropTypes.string.isRequired,
    currentFunnelLabel: PropTypes.string.isRequired,
    unknownName: PropTypes.string.isRequired,
    fileError: PropTypes.string.isRequired,
    complexityLabel: PropTypes.string.isRequired,
  }).isRequired,
  onExit: PropTypes.func.isRequired,
};

FunnelComparison.defaultProps = {
  locale: 'ru-RU',
};

export default FunnelComparison;
