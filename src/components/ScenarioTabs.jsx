import PropTypes from 'prop-types';
import { clsx } from 'clsx';

function ScenarioTabs({ label, scenarios, activeScenarioId, onScenarioChange }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onScenarioChange(scenario.id)}
            className={clsx(
              'rounded-full border px-4 py-1.5 text-sm transition',
              scenario.id === activeScenarioId
                ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100'
                : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-400',
            )}
          >
            {scenario.name}
          </button>
        ))}
      </div>
    </div>
  );
}

ScenarioTabs.propTypes = {
  label: PropTypes.string.isRequired,
  scenarios: PropTypes.array.isRequired,
  activeScenarioId: PropTypes.string.isRequired,
  onScenarioChange: PropTypes.func.isRequired,
};

export default ScenarioTabs;
