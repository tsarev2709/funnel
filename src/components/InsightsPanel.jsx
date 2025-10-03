import PropTypes from 'prop-types';
import { LightBulbIcon, ChartPieIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';

function createFormatter(locale) {
  try {
    return new Intl.NumberFormat(locale ?? 'ru-RU', { maximumFractionDigits: 1 });
  } catch (error) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  }
}

function InsightsPanel({ metrics, zones, locale, trafficChannels }) {
  const numberFormatter = useMemo(() => createFormatter(locale), [locale]);
  const { bottleneck, insight, stages, retentionSummary } = metrics;
  const retention = retentionSummary ?? null;
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <LightBulbIcon className="h-5 w-5 text-amber-300" /> Авто-инсайт
        </div>
        <p className="mt-2 text-sm text-slate-300">{insight}</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Бутылочное горлышко</h3>
        {bottleneck ? (
          <dl className="mt-2 space-y-1 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <dt>{bottleneck.name}</dt>
              <dd className="text-rose-300">−{numberFormatter.format(bottleneck.drop)} лидов</dd>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Конверсия</span>
              <span>
                {numberFormatter.format(bottleneck.baseConversion)}% → {numberFormatter.format(bottleneck.improvedConversion)}%
              </span>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Горлышко не обнаружено.</p>
        )}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Повторные касания / RFM</h3>
        {retention ? (
          <dl className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between text-slate-400">
              <dt>База клиентов</dt>
              <dd>{numberFormatter.format(retention.baseCustomers)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300">Лояльные</dt>
              <dd>
                {numberFormatter.format(retention.loyalShare)}% → {numberFormatter.format(retention.loyalShareImproved)}%
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-amber-300">At-risk</dt>
              <dd>
                {numberFormatter.format(retention.atRiskShare)}% → {numberFormatter.format(retention.atRiskShareImproved)}%
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-cyan-300">Спящие</dt>
              <dd>
                {numberFormatter.format(retention.sleepingShare)}% → {numberFormatter.format(retention.sleepingShareImproved)}%
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-rose-300">Churn rate</dt>
              <dd>
                {numberFormatter.format(retention.churnRate)}% → {numberFormatter.format(retention.churnRateImproved)}%
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Добавьте этап с зоной «Повторные касания».</p>
        )}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Бенчмарки зон</h3>
        <ul className="mt-2 space-y-2 text-xs text-slate-400">
          {zones.map((zone) => {
            const zoneStages = stages.filter((stage) => stage.zoneId === zone.id);
            const avgConversion = zoneStages.length
              ? zoneStages.slice(1).reduce((sum, stage) => sum + (stage.baseConversion ?? 0), 0) / Math.max(1, zoneStages.length - 1)
              : 0;
            return (
              <li key={zone.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} /> {zone.name}
                </span>
                <span>{numberFormatter.format(avgConversion)}% средн.</span>
              </li>
            );
          })}
        </ul>
      </div>
      {trafficChannels?.length ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <ChartPieIcon className="h-4 w-4 text-cyan-300" /> Каналы трафика
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            {trafficChannels.map((channel) => (
              <li key={channel.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-200">{channel.name}</div>
                  {channel.note && <p className="text-[11px] text-slate-500">{channel.note}</p>}
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-200">
                  {numberFormatter.format(channel.share)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

InsightsPanel.propTypes = {
  metrics: PropTypes.object.isRequired,
  zones: PropTypes.array.isRequired,
  locale: PropTypes.string,
  trafficChannels: PropTypes.array,
};

export default InsightsPanel;
