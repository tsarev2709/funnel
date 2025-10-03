import PropTypes from 'prop-types';
import { LightBulbIcon } from '@heroicons/react/24/outline';

const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

function InsightsPanel({ metrics, zones }) {
  const { bottleneck, insight, stages } = metrics;
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
    </div>
  );
}

InsightsPanel.propTypes = {
  metrics: PropTypes.object.isRequired,
  zones: PropTypes.array.isRequired,
};

export default InsightsPanel;
