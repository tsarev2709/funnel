import PropTypes from 'prop-types';
import { useMemo } from 'react';

function createNumberFormatter(locale, options = {}) {
  try {
    return new Intl.NumberFormat(locale ?? 'ru-RU', options);
  } catch (error) {
    return new Intl.NumberFormat('ru-RU', options);
  }
}

function formatValue(value, kpi, locale) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const { format, fractionDigits, minimumFractionDigits, currency, suffix } = kpi ?? {};
  const digits = fractionDigits ?? (format === 'percent' ? 1 : 0);
  const options = {
    maximumFractionDigits: digits,
    minimumFractionDigits: minimumFractionDigits ?? 0,
  };

  if (format === 'currency' && currency) {
    options.style = 'currency';
    options.currency = currency;
  }

  const formatter = createNumberFormatter(locale, options);
  let formatted = formatter.format(value);

  if (format === 'percent') {
    formatted = `${formatted}%`;
  }

  if (suffix) {
    formatted = `${formatted} ${suffix}`.trim();
  }

  return formatted;
}

function formatDelta(base, improved, kpi, locale) {
  if (base === null || base === undefined || improved === null || improved === undefined) {
    return null;
  }
  const delta = improved - base;
  if (Math.abs(delta) < Number.EPSILON) {
    return null;
  }
  const sign = delta > 0 ? '+' : '−';
  const formatted = formatValue(Math.abs(delta), kpi, locale);
  return `${sign}${formatted}`;
}

function Stakeholders({ title, stakeholders, metrics, locale, strings }) {
  const stageMap = useMemo(() => {
    const map = new Map();
    (metrics?.stages ?? []).forEach((stage) => {
      map.set(stage.id, stage);
    });
    return map;
  }, [metrics?.stages]);

  if (!stakeholders?.length) {
    return null;
  }

  const { baseLabel = 'База', deltaZero = 'Δ 0', focusLabel = 'Фокус улучшений' } = strings ?? {};

  return (
    <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-indigo-950/40">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stakeholders.map((stakeholder) => (
          <article
            key={stakeholder.id}
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{stakeholder.avatar ?? '👤'}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{stakeholder.name}</div>
                  {stakeholder.role ? (
                    <div className="text-xs uppercase tracking-wide text-slate-500">{stakeholder.role}</div>
                  ) : null}
                </div>
              </div>
              {stakeholder.summary ? (
                <p className="mt-3 text-xs text-slate-400">{stakeholder.summary}</p>
              ) : null}
              {stakeholder.kpis?.length ? (
                <dl className="mt-4 space-y-3">
                  {stakeholder.kpis.map((kpi) => {
                    let base = null;
                    let improved = null;

                    if (kpi.source === 'stage' && kpi.stageId) {
                      const stage = stageMap.get(kpi.stageId);
                      const baseField = kpi.baseField ?? 'baseValue';
                      const improvedField = kpi.improvedField ?? 'improvedValue';
                      base = stage?.[baseField] ?? null;
                      improved = stage?.[improvedField] ?? base;
                    } else if (kpi.source === 'metric') {
                      base = kpi.basePath ? metrics?.[kpi.basePath] ?? null : null;
                      improved = kpi.improvedPath ? metrics?.[kpi.improvedPath] ?? base : base;
                    } else if (typeof kpi.resolve === 'function') {
                      const resolved = kpi.resolve({ metrics, stageMap });
                      base = resolved?.base ?? null;
                      improved = resolved?.improved ?? base;
                    }

                    const delta = formatDelta(base, improved, kpi, locale);
                    const improvedFormatted = formatValue(improved, kpi, locale);
                    const baseFormatted = formatValue(base, kpi, locale);

                    return (
                      <div key={kpi.id ?? kpi.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <dt className="text-xs font-semibold text-slate-200">{kpi.label}</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-100">{improvedFormatted}</dd>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {baseLabel}: {baseFormatted}
                          </span>
                          {delta ? (
                            <span className={delta.startsWith('+') ? 'text-emerald-300' : 'text-rose-300'}>{delta}</span>
                          ) : (
                            <span className="text-slate-500">{deltaZero}</span>
                          )}
                        </div>
                        {kpi.description ? (
                          <p className="mt-1 text-[11px] text-slate-500">{kpi.description}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </dl>
              ) : null}
            </div>
            {stakeholder.improvements?.length ? (
              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{focusLabel}</div>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {stakeholder.improvements.map((item, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-slate-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

Stakeholders.propTypes = {
  title: PropTypes.string.isRequired,
  stakeholders: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      avatar: PropTypes.string,
      role: PropTypes.string,
      summary: PropTypes.string,
      kpis: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          label: PropTypes.string.isRequired,
          source: PropTypes.oneOf(['metric', 'stage']),
          stageId: PropTypes.string,
          baseField: PropTypes.string,
          improvedField: PropTypes.string,
          basePath: PropTypes.string,
          improvedPath: PropTypes.string,
          format: PropTypes.oneOf(['number', 'percent', 'currency']),
          fractionDigits: PropTypes.number,
          minimumFractionDigits: PropTypes.number,
          currency: PropTypes.string,
          suffix: PropTypes.string,
          description: PropTypes.string,
          resolve: PropTypes.func,
        }),
      ),
      improvements: PropTypes.arrayOf(PropTypes.string),
    }),
  ).isRequired,
  metrics: PropTypes.shape({ stages: PropTypes.array }),
  locale: PropTypes.string,
  strings: PropTypes.shape({
    baseLabel: PropTypes.string,
    deltaZero: PropTypes.string,
    focusLabel: PropTypes.string,
  }),
};

Stakeholders.defaultProps = {
  metrics: { stages: [] },
  locale: 'ru-RU',
  strings: {
    baseLabel: 'База',
    deltaZero: 'Δ 0',
    focusLabel: 'Фокус улучшений',
  },
};

export default Stakeholders;
