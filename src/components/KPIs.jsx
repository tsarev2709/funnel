import PropTypes from 'prop-types';
import { useMemo } from 'react';

function createFormatter(locale) {
  return (value, fraction = 1) => {
    try {
      return new Intl.NumberFormat(locale ?? 'ru-RU', { maximumFractionDigits: fraction }).format(value ?? 0);
    } catch (error) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: fraction }).format(value ?? 0);
    }
  };
}

function KPIBlock({ label, base, improved, accent }) {
  const delta = (improved ?? 0) - (base ?? 0);
  const deltaPercent = base ? (delta / base) * 100 : 0;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{KPIBlock.formatNumber(improved ?? base)}</div>
      <div className="mt-1 text-sm text-slate-400">База: {KPIBlock.formatNumber(base)}</div>
      <div className={`mt-1 text-xs font-semibold ${accent}`}>
        Δ {KPIBlock.formatNumber(delta)} ({KPIBlock.formatNumber(deltaPercent)}%)
      </div>
    </div>
  );
}

KPIBlock.propTypes = {
  label: PropTypes.string.isRequired,
  base: PropTypes.number,
  improved: PropTypes.number,
  accent: PropTypes.string,
};

KPIBlock.formatNumber = (value, fraction = 1) => {
  try {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: fraction }).format(value ?? 0);
  } catch (error) {
    return String(value ?? 0);
  }
};

function KPIs({ title, metrics, finances, onFinancesChange, locale }) {
  const formatNumber = useMemo(() => createFormatter(locale), [locale]);
  KPIBlock.formatNumber = formatNumber;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <button onClick={() => window.print()} className="rounded-md border border-slate-700 px-3 py-1 hover:border-cyan-400">
            Экспорт PDF/PNG
          </button>
          <div className="rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1">
            Финансы: ROI {formatNumber(metrics.roiImproved)}% (база {formatNumber(metrics.roiBase)}%)
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPIBlock label="Финальный выход (шт.)" base={metrics.finalBase} improved={metrics.finalImproved} accent="text-emerald-300" />
        <KPIBlock label="Рост в штуках" base={0} improved={metrics.deltaUnits} accent="text-emerald-300" />
        <KPIBlock label="Рост %" base={0} improved={metrics.deltaPercent} accent="text-cyan-300" />
        <KPIBlock label="Потери по пути" base={metrics.topValue - metrics.finalBase} improved={metrics.topValue - metrics.finalImproved} accent="text-rose-300" />
        {metrics.churnRate !== null && metrics.churnRateImproved !== null && (
          <KPIBlock label="Churn rate" base={metrics.churnRate} improved={metrics.churnRateImproved} accent="text-rose-300" />
        )}
        {metrics.retentionSummary && (
          <KPIBlock
            label="Лояльные клиенты %"
            base={metrics.retentionSummary.loyalShare}
            improved={metrics.retentionSummary.loyalShareImproved}
            accent="text-emerald-300"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Финансовые параметры</h3>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Средний чек</span>
              <input
                type="number"
                value={finances.avgCheck ?? ''}
                onChange={(event) => onFinancesChange({ avgCheck: Number(event.target.value) })}
                className="w-32 rounded border border-slate-700 bg-slate-950/70 px-2 py-1"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-400">CPL</span>
              <input
                type="number"
                value={finances.cpl ?? ''}
                onChange={(event) => onFinancesChange({ cpl: Number(event.target.value) })}
                className="w-32 rounded border border-slate-700 bg-slate-950/70 px-2 py-1"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-400">CAC</span>
              <input
                type="number"
                value={finances.cac ?? ''}
                onChange={(event) => onFinancesChange({ cac: Number(event.target.value) })}
                className="w-32 rounded border border-slate-700 bg-slate-950/70 px-2 py-1"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-400">LTV</span>
              <input
                type="number"
                value={finances.ltv ?? ''}
                onChange={(event) => onFinancesChange({ ltv: Number(event.target.value) })}
                className="w-32 rounded border border-slate-700 bg-slate-950/70 px-2 py-1"
              />
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Денежный поток</h3>
          <dl className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <dt>Выручка база</dt>
              <dd className="text-slate-200">{formatNumber(metrics.revenueBase, 0)} ₽</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Выручка улучш.</dt>
              <dd className="text-emerald-300">{formatNumber(metrics.revenueImproved, 0)} ₽</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Маркетинг расход</dt>
              <dd>{formatNumber(metrics.spendBase, 0)} ₽ → {formatNumber(metrics.spendImproved, 0)} ₽</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Маржинальный доход</dt>
              <dd>{formatNumber(metrics.grossMarginBase, 0)} ₽ → {formatNumber(metrics.grossMarginImproved, 0)} ₽</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Unit-экономика</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>CAC: {formatNumber(finances.cac)} ₽</li>
            <li>LTV: {formatNumber(finances.ltv)} ₽ (LTV/CAC = {finances.cac ? formatNumber(finances.ltv / finances.cac) : '∞'})</li>
            <li>Payback (m): {formatNumber(metrics.paybackMonths)}</li>
            <li>Δ ROI: {formatNumber(metrics.roiImproved - metrics.roiBase)} п.п.</li>
            {metrics.churnRate !== null && (
              <li>Churn rate: {formatNumber(metrics.churnRate)}% → {formatNumber(metrics.churnRateImproved)}%</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

KPIs.propTypes = {
  title: PropTypes.string.isRequired,
  metrics: PropTypes.object.isRequired,
  finances: PropTypes.object.isRequired,
  onFinancesChange: PropTypes.func.isRequired,
  locale: PropTypes.string,
};

KPIs.defaultProps = {
  locale: 'ru-RU',
};

KPIs.createFormatter = createFormatter;

export default KPIs;
