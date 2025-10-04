import PropTypes from 'prop-types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

function ZonesEditor({ title, zones, onZoneChange, onZoneAdd, onZoneRemove }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 card-animated">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <button
          onClick={onZoneAdd}
          className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:-translate-y-0.5 hover:bg-cyan-500/20 active:scale-95"
        >
          <PlusIcon className="h-4 w-4" /> Добавить зону
        </button>
      </div>
      <div className="space-y-3 text-sm text-slate-200">
        {zones.map((zone) => (
          <div key={zone.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 card-animated">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
              <input
                value={zone.name}
                onChange={(event) => onZoneChange(zone.id, { name: event.target.value })}
                className="w-32 rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs"
              />
              <input
                type="color"
                value={zone.color}
                onChange={(event) => onZoneChange(zone.id, { color: event.target.value })}
                className="h-8 w-16 rounded border border-slate-700 bg-slate-900/70"
              />
            </div>
            <button
              onClick={() => onZoneRemove(zone.id)}
              className="transform rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-500/20 active:scale-95"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

ZonesEditor.propTypes = {
  title: PropTypes.string.isRequired,
  zones: PropTypes.array.isRequired,
  onZoneChange: PropTypes.func.isRequired,
  onZoneAdd: PropTypes.func.isRequired,
  onZoneRemove: PropTypes.func.isRequired,
};

export default ZonesEditor;
