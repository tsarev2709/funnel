import PropTypes from 'prop-types';
import { SparklesIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';

const defaultStrings = {
  stageLabel: 'Этап',
  active: 'Включено',
  activate: 'Активировать',
  improvedOutput: 'Улучшенный выход',
  subtitle: 'плюсики роста',
  empty: 'Для пресета пока нет левериджей.',
};

function createFormatter(locale) {
  try {
    return new Intl.NumberFormat(locale ?? 'ru-RU', { maximumFractionDigits: 1 });
  } catch (error) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  }
}

function Levers({ title, subtitle, levers, activeLevers, onToggle, stages, locale, strings = defaultStrings }) {
  const copy = { ...defaultStrings, ...(strings ?? {}) };
  const numberFormatter = useMemo(() => createFormatter(locale), [locale]);
  const stageLookup = stages.reduce((acc, stage) => {
    acc[stage.id] = stage;
    return acc;
  }, {});

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-500">{subtitle ?? copy.subtitle}</span>
      </div>
      <div className="space-y-3">
        {levers.map((lever) => {
          const stage = stageLookup[lever.stageId];
          const isActive = activeLevers.has(lever.id);
          return (
            <div
              key={lever.id}
              className={`rounded-2xl border ${isActive ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40'} p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <SparklesIcon className="h-4 w-4 text-emerald-300" /> {lever.name}
                </div>
                <p className="mt-1 text-xs text-slate-400">{lever.description}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {copy.stageLabel}: <span className="text-slate-200">{stage?.name ?? '—'}</span>
                </p>
              </div>
              <button
                onClick={() => onToggle(lever.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${isActive ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-emerald-400'}`}
              >
                {isActive ? copy.active : copy.activate}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                +{numberFormatter.format(lever.conversionBoost)} п.п. конверсии
              </span>
              {stage && (
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                  {copy.improvedOutput}: {numberFormatter.format(stage.improvedValue)} vs {numberFormatter.format(stage.baseValue)}
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              {lever.tactics?.map((tactic) => (
                  <div key={tactic} className="flex items-start gap-2">
                    <PlusCircleIcon className="mt-[2px] h-3.5 w-3.5 text-cyan-300" />
                    <span>{tactic}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!levers.length && <p className="text-sm text-slate-500">{copy.empty}</p>}
      </div>
    </section>
  );
}

Levers.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  levers: PropTypes.array.isRequired,
  activeLevers: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
  stages: PropTypes.array.isRequired,
  locale: PropTypes.string,
  strings: PropTypes.object,
};

export default Levers;
