import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { BanknotesIcon, BoltIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';

function createFormatter(locale, options = {}) {
  try {
    return new Intl.NumberFormat(locale ?? 'ru-RU', options);
  } catch (error) {
    return new Intl.NumberFormat('ru-RU', options);
  }
}

function ScenarioSummary({ scenario, metrics, locale }) {
  if (!metrics) return null;
  const numberFormatter = useMemo(() => createFormatter(locale, { maximumFractionDigits: 1 }), [locale]);
  const currencyFormatter = useMemo(() => createFormatter(locale, { maximumFractionDigits: 0 }), [locale]);

  const scenarioName = scenario?.name ?? 'Сценарий';
  const sharePercent = metrics.marketingBudgetShare != null ? metrics.marketingBudgetShare * 100 : null;
  const budgetLabel = metrics.marketingBudgetLabel ?? '—';
  const budgetStatus = metrics.marketingBudgetStatus ?? '—';
  const spendBase = metrics.spendBase ?? 0;
  const spendImproved = metrics.spendImproved ?? spendBase;
  const description = metrics.scenarioDescription ?? scenario?.description ?? '';
  const plays = metrics.scenarioPlays ?? [];
  const trafficMix = metrics.trafficMix ?? [];

  return (
    <section className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 card-animated">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Активный сценарий</span>
          <h2 className="text-xl font-semibold text-slate-50">{scenarioName}</h2>
          {description && <p className="text-sm text-slate-300">{description}</p>}
        </div>
        <div className="pulse-ring inline-flex flex-col gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-5 py-4 text-cyan-100">
          <span className="text-xs uppercase tracking-wide text-cyan-200/70">Бюджет</span>
          <span className="text-2xl font-semibold">
            {sharePercent != null ? `${numberFormatter.format(sharePercent)}%` : '—'}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-cyan-200/70">{budgetLabel}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 card-animated">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <BanknotesIcon className="h-5 w-5 text-emerald-300" /> Инвестиции
            </div>
            <dl className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <dt>База</dt>
                <dd className="font-medium text-slate-100">{currencyFormatter.format(spendBase)} ₽</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Сценарий</dt>
                <dd className="font-medium text-emerald-300">{currencyFormatter.format(spendImproved)} ₽</dd>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-cyan-200">
                {budgetStatus}
              </div>
            </dl>
          </div>

          {plays?.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 card-animated">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <BoltIcon className="h-5 w-5 text-amber-300" /> Ключевые плейбуки
              </div>
              <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                {plays.map((play) => (
                  <li
                    key={play}
                    className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200 transition hover:-translate-y-0.5 hover:border-amber-300"
                  >
                    {play}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 card-animated">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <RocketLaunchIcon className="h-5 w-5 text-cyan-300" /> Микс каналов в сценарии
          </div>
          {trafficMix?.length ? (
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {trafficMix.map((channel) => (
                <li key={channel.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{channel.name}</span>
                    <span className="text-xs text-cyan-200">
                      {numberFormatter.format(channel.share ?? 0)}%
                    </span>
                  </div>
                  {channel.note && <p className="text-[11px] text-slate-500">{channel.note}</p>}
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                      style={{ width: `${Math.max(5, Math.min(100, channel.share ?? 0))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Добавьте каналы, чтобы отследить распределение трафика.</p>
          )}
        </div>
      </div>
    </section>
  );
}

ScenarioSummary.propTypes = {
  scenario: PropTypes.object,
  metrics: PropTypes.shape({
    marketingBudgetShare: PropTypes.number,
    marketingBudgetLabel: PropTypes.string,
    marketingBudgetStatus: PropTypes.string,
    spendBase: PropTypes.number,
    spendImproved: PropTypes.number,
    scenarioDescription: PropTypes.string,
    scenarioPlays: PropTypes.arrayOf(PropTypes.string),
    trafficMix: PropTypes.arrayOf(PropTypes.object),
  }),
  locale: PropTypes.string,
};

ScenarioSummary.defaultProps = {
  scenario: null,
  metrics: null,
  locale: 'ru-RU',
};

export default ScenarioSummary;
