import PropTypes from 'prop-types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';

function createFormatter(locale) {
  try {
    return new Intl.NumberFormat(locale ?? 'ru-RU', { maximumFractionDigits: 1 });
  } catch (error) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  }
}

function StageCard({ stage, zones, onStageChange, onStageRemove, onNoteChange, onFocusStage, locale }) {
  const numberFormatter = useMemo(() => createFormatter(locale), [locale]);
  const zoneOptions = zones ?? [];
  const isPercentMode = stage.mode !== 'absolute';
  const trafficChannels = stage.trafficChannels ?? [];

  const handleValueChange = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const patch = { value: numeric };
    if (isPercentMode && stage.previousBaseValue) {
      const computedConversion = stage.previousBaseValue ? (numeric / stage.previousBaseValue) * 100 : stage.conversion;
      patch.conversion = computedConversion;
    }
    onStageChange(stage.id, patch);
  };

  const handleConversionChange = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const patch = { conversion: numeric };
    if (stage.previousBaseValue) {
      patch.value = (stage.previousBaseValue * numeric) / 100;
    }
    onStageChange(stage.id, patch);
  };

  const handleModeToggle = () => {
    if (stage.mode === 'absolute') {
      const computedConversion = stage.previousBaseValue
        ? (stage.baseValue / stage.previousBaseValue) * 100
        : stage.conversion ?? 50;
      onStageChange(stage.id, { mode: 'percent', conversion: computedConversion });
    } else {
      const absoluteValue = stage.baseValue ?? stage.value;
      onStageChange(stage.id, { mode: 'absolute', value: absoluteValue });
    }
  };

  const handleTrafficChannelChange = (channelId, patch) => {
    const next = trafficChannels.map((channel) => (channel.id === channelId ? { ...channel, ...patch } : channel));
    onStageChange(stage.id, { trafficChannels: next });
  };

  const handleTrafficChannelAdd = () => {
    const id = `${stage.id}-traffic-${Date.now()}`;
    onStageChange(stage.id, {
      trafficChannels: [...trafficChannels, { id, name: '', share: 0, note: '' }],
    });
  };

  const handleTrafficChannelRemove = (channelId) => {
    onStageChange(stage.id, {
      trafficChannels: trafficChannels.filter((channel) => channel.id !== channelId),
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 card-animated">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <input
            value={stage.name}
            onChange={(event) => onStageChange(stage.id, { name: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 focus:border-cyan-400 focus:outline-none"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
              Зона
              <select
                value={stage.zoneId}
                onChange={(event) => onStageChange(stage.id, { zoneId: event.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              >
                {zoneOptions.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
              Бенчмарк %
              <input
                type="number"
                value={stage.benchmark ?? ''}
                onChange={(event) => onStageChange(stage.id, { benchmark: Number(event.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
              {isPercentMode ? 'Базовая конверсия %' : 'Абсолютное значение'}
              <input
                type="number"
                value={isPercentMode ? stage.conversion ?? 0 : stage.value ?? 0}
                onChange={(event) =>
                  isPercentMode ? handleConversionChange(event.target.value) : handleValueChange(event.target.value)
                }
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
              Фактическое значение
              <input
                type="number"
                value={stage.baseValue ?? stage.value ?? 0}
                onChange={(event) => handleValueChange(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
              Тип ввода
              <button
                onClick={handleModeToggle}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400"
              >
                {isPercentMode ? 'Конверсия %' : 'Абсолютно'}
              </button>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
            Заметка / инсайт
            <textarea
              value={stage.note ?? ''}
              onChange={(event) => onNoteChange(stage.id, event.target.value)}
              className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-400">Каналы трафика этапа</span>
              <button
                onClick={handleTrafficChannelAdd}
                className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-500/20 active:scale-95"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Канал
              </button>
            </div>
            {trafficChannels.length ? (
              <div className="space-y-3">
                {trafficChannels.map((channel) => (
                  <div key={channel.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <input
                        value={channel.name ?? ''}
                        onChange={(event) => handleTrafficChannelChange(channel.id, { name: event.target.value })}
                        placeholder="Название канала"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={channel.share ?? 0}
                          onChange={(event) => {
                            const numeric = Number(event.target.value);
                            handleTrafficChannelChange(channel.id, {
                              share: Number.isFinite(numeric) ? numeric : 0,
                            });
                          }}
                          className="w-20 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                      <button
                        onClick={() => handleTrafficChannelRemove(channel.id)}
                        className="self-start rounded-lg border border-rose-600/40 bg-rose-500/10 p-2 text-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-500/20 active:scale-95"
                        title="Удалить канал"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={channel.note ?? ''}
                      onChange={(event) => handleTrafficChannelChange(channel.id, { note: event.target.value })}
                      placeholder="Комментарий, подсказки, CTA"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Добавьте источники трафика для этого этапа.</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onStageRemove(stage.id)}
          className="transform rounded-lg border border-rose-600/40 bg-rose-500/10 p-2 text-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-500/20 active:scale-95"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Потери: <span className="text-rose-300">{numberFormatter.format(stage.drop ?? 0)}</span>
        </div>
        <button
          onClick={() => onFocusStage(stage.id)}
          className="transform rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:-translate-y-0.5 hover:bg-cyan-500/20 active:scale-95"
        >
          Фокус на визуализации
        </button>
      </div>
    </div>
  );
}

StageCard.propTypes = {
  stage: PropTypes.object.isRequired,
  zones: PropTypes.array.isRequired,
  onStageChange: PropTypes.func.isRequired,
  onStageRemove: PropTypes.func.isRequired,
  onNoteChange: PropTypes.func.isRequired,
  onFocusStage: PropTypes.func.isRequired,
};

function Editor({ title, stages, zones, onStageChange, onStageAdd, onStageRemove, onNoteChange, onFocusStage, locale }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <button
          onClick={() => onStageAdd()}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-500/20 active:scale-95"
        >
          <PlusIcon className="h-4 w-4" /> Добавить этап
        </button>
      </div>
      <div className="space-y-4">
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            zones={zones}
            onStageChange={onStageChange}
            onStageRemove={onStageRemove}
            onNoteChange={onNoteChange}
            onFocusStage={onFocusStage}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

Editor.propTypes = {
  title: PropTypes.string.isRequired,
  stages: PropTypes.array.isRequired,
  zones: PropTypes.array.isRequired,
  onStageChange: PropTypes.func.isRequired,
  onStageAdd: PropTypes.func.isRequired,
  onStageRemove: PropTypes.func.isRequired,
  onNoteChange: PropTypes.func.isRequired,
  onFocusStage: PropTypes.func.isRequired,
  locale: PropTypes.string,
};

export default Editor;
