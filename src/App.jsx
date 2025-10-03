import { useEffect, useMemo, useState } from 'react';
import { presets as presetLibrary, defaultZones } from './data/presets.js';
import FunnelSVG from './components/FunnelSVG.jsx';
import Editor from './components/Editor.jsx';
import KPIs from './components/KPIs.jsx';
import Levers from './components/Levers.jsx';
import ZonesEditor from './components/ZonesEditor.jsx';
import ScenarioTabs from './components/ScenarioTabs.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import NotesTasks from './components/NotesTasks.jsx';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, LanguageIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

const translations = {
  ru: {
    preset: 'Пресет',
    scenario: 'Сценарии',
    exportJson: 'Экспорт JSON',
    importJson: 'Импорт JSON/CSV',
    toggleLang: 'EN',
    kpi: 'KPI и финансы',
    editor: 'Этапы воронки',
    levers: 'Левериджи',
    zones: 'Зоны',
    insights: 'Инсайты',
    notes: 'Задачи и заметки',
    presentation: 'Режим презентации',
    stop: 'Стоп',
  },
  en: {
    preset: 'Preset',
    scenario: 'Scenarios',
    exportJson: 'Export JSON',
    importJson: 'Import JSON/CSV',
    toggleLang: 'RU',
    kpi: 'KPIs & Finance',
    editor: 'Funnel stages',
    levers: 'Levers',
    zones: 'Zones',
    insights: 'Insights',
    notes: 'Tasks & notes',
    presentation: 'Presentation mode',
    stop: 'Stop',
  },
};

const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function loadPreset(preset) {
  const clone = deepClone(preset);
  return {
    id: clone.id,
    name: clone.name,
    description: clone.description,
    logo: clone.logo,
    stages: clone.stages,
    zones: clone.zones?.length ? clone.zones : deepClone(defaultZones),
    levers: clone.levers || [],
    finances: clone.finances || { avgCheck: 0, cpl: 0, cac: 0, ltv: 0 },
    scenarios: clone.scenarios || [{ id: 'base', name: 'Base', adjustments: {} }],
  };
}

const fallbackScenario = { id: 'base', name: 'Base', adjustments: {} };

const conversionFromValues = (current, previous) => {
  if (!previous || previous === 0) return 100;
  return (current / previous) * 100;
};

function App() {
  const [language, setLanguage] = useState('ru');
  const [presetId, setPresetId] = useState(presetLibrary[0]?.id);
  const [scenarioId, setScenarioId] = useState(presetLibrary[0]?.scenarios?.[0]?.id ?? fallbackScenario.id);
  const [state, setState] = useState(() => loadPreset(presetLibrary[0]));
  const [activeLevers, setActiveLevers] = useState(() => new Set());
  const [focusedStageId, setFocusedStageId] = useState(null);
  const [presentation, setPresentation] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(null);

  useEffect(() => {
    const preset = presetLibrary.find((item) => item.id === presetId) ?? presetLibrary[0];
    const loaded = loadPreset(preset);
    setState(loaded);
    setScenarioId(loaded.scenarios?.[0]?.id ?? fallbackScenario.id);
    setActiveLevers(new Set());
    setFocusedStageId(null);
    setPresentation(false);
  }, [presetId]);

  useEffect(() => {
    if (!presentation) {
      setPresentationIndex(null);
      return;
    }
    setPresentationIndex(0);
    const interval = setInterval(() => {
      setPresentationIndex((prev) => {
        if (prev === null) return 0;
        const next = prev + 1;
        return next >= state.stages.length ? 0 : next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [presentation, state.stages.length]);

  const currentScenario = useMemo(() => {
    return state.scenarios?.find((scenario) => scenario.id === scenarioId) ?? fallbackScenario;
  }, [scenarioId, state.scenarios]);

  const metrics = useMemo(() => {
    const scenarioAdjustments = currentScenario?.adjustments ?? {};
    const leverMap = state.levers.reduce((acc, lever) => {
      if (activeLevers.has(lever.id)) {
        acc[lever.stageId] = (acc[lever.stageId] ?? 0) + (lever.conversionBoost ?? 0);
      }
      return acc;
    }, {});

    const baseStages = [];
    const improvedStages = [];

    let previousBaseValue = null;
    let previousImprovedValue = null;

    state.stages.forEach((stage, index) => {
      const prevBase = previousBaseValue ?? stage.value;
      const effectiveConversion = index === 0 ? 100 : stage.mode === 'percent' ? stage.conversion ?? conversionFromValues(stage.value, previousBaseValue ?? stage.value) : conversionFromValues(stage.value, previousBaseValue ?? stage.value);
      const scenarioBoost = scenarioAdjustments?.[stage.id]?.conversion ?? 0;
      const scenarioValueBoost = scenarioAdjustments?.[stage.id]?.value ?? 0;
      const leverBoost = leverMap?.[stage.id] ?? 0;

      const baseValue = index === 0 || stage.mode === 'absolute'
        ? stage.value
        : (previousBaseValue ?? 0) * (effectiveConversion / 100);

      const baseConversion = index === 0 ? 100 : stage.mode === 'absolute' ? conversionFromValues(stage.value, previousBaseValue ?? stage.value) : effectiveConversion;

      const improvedConversionRaw = index === 0 ? 100 + scenarioValueBoost : baseConversion + scenarioBoost + leverBoost;
      const improvedConversion = index === 0 && stage.mode === 'absolute'
        ? Math.max(1, improvedConversionRaw)
        : Math.max(0, Math.min(100, improvedConversionRaw));

      const improvedBase = index === 0
        ? stage.value * (1 + scenarioValueBoost / 100)
        : stage.mode === 'absolute'
          ? stage.value * (1 + scenarioValueBoost / 100)
          : (previousImprovedValue ?? 0) * (improvedConversion / 100);

      const benchmark = stage.benchmark ?? null;
      const drop = index === 0 ? 0 : Math.max(0, (previousBaseValue ?? baseValue) - baseValue);
      const improvedDrop = index === 0 ? 0 : Math.max(0, (previousImprovedValue ?? improvedBase) - improvedBase);

      const stageMetrics = {
        ...stage,
        index,
        baseValue,
        baseConversion,
        improvedValue: improvedBase,
        improvedConversion,
        benchmark,
        drop,
        improvedDrop,
        scenarioBoost,
        leverBoost,
      };

      baseStages.push(stageMetrics);
      improvedStages.push(stageMetrics);

      previousBaseValue = baseValue;
      previousImprovedValue = improvedBase;
    });

    const topValue = baseStages[0]?.baseValue ?? 0;
    const finalBase = baseStages[baseStages.length - 1]?.baseValue ?? 0;
    const finalImproved = improvedStages[improvedStages.length - 1]?.improvedValue ?? 0;
    const deltaUnits = finalImproved - finalBase;
    const deltaPercent = finalBase > 0 ? (deltaUnits / finalBase) * 100 : 0;

    const marketingStage = baseStages[1] ?? baseStages[0];
    const marketingLeads = marketingStage?.baseValue ?? 0;
    const improvedMarketingLeads = marketingStage?.improvedValue ?? marketingLeads;

    const spendBase = marketingLeads * (state.finances.cpl ?? 0);
    const spendImproved = improvedMarketingLeads * (state.finances.cpl ?? 0);
    const dealsBase = finalBase;
    const dealsImproved = finalImproved;
    const revenueBase = dealsBase * (state.finances.avgCheck ?? 0);
    const revenueImproved = dealsImproved * (state.finances.avgCheck ?? 0);
    const cac = state.finances.cac ?? 0;
    const ltv = state.finances.ltv ?? 0;
    const grossMarginBase = revenueBase - spendBase - dealsBase * cac;
    const grossMarginImproved = revenueImproved - spendImproved - dealsImproved * cac;
    const roiBase = spendBase > 0 ? (grossMarginBase / spendBase) * 100 : 0;
    const roiImproved = spendImproved > 0 ? (grossMarginImproved / spendImproved) * 100 : 0;
    const paybackMonths = cac > 0 ? (state.finances.avgCheck > 0 ? (state.finances.avgCheck / cac) : 0) : 0;

    const bottleneck = baseStages.slice(1).reduce(
      (worst, stage) => {
        if (!worst || stage.drop > worst.drop) return stage;
        return worst;
      },
      null,
    );

    const insight = bottleneck
      ? `Самая большая потеря (${numberFormatter.format(bottleneck.drop)}) на этапе «${bottleneck.name}». Улучшение конверсии на 5 п.п. даст дополнительно ~${numberFormatter.format((baseStages[bottleneck.index - 1]?.baseValue ?? 0) * 0.05)} лидов.`
      : 'Воронка стабильна, улучшайте верх и удержание одновременно.';

    return {
      stages: baseStages,
      topValue,
      finalBase,
      finalImproved,
      deltaUnits,
      deltaPercent,
      spendBase,
      spendImproved,
      revenueBase,
      revenueImproved,
      roiBase,
      roiImproved,
      paybackMonths,
      grossMarginBase,
      grossMarginImproved,
      bottleneck,
      insight,
    };
  }, [state.stages, state.levers, state.finances, currentScenario, activeLevers]);

  const { stages: stageMetrics } = metrics;

  const handleStageChange = (stageId, patch) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
    }));
  };

  const handleStageAdd = (zoneId) => {
    const id = `stage-${Date.now()}`;
    const previous = state.stages[state.stages.length - 1];
    const newStage = {
      id,
      name: 'Новый этап',
      mode: 'percent',
      value: previous ? Math.round(previous.value * 0.6) : 1000,
      conversion: 60,
      benchmark: 60,
      note: '',
      zoneId: zoneId ?? previous?.zoneId ?? state.zones[0]?.id,
      tasks: [],
    };
    setState((prev) => ({ ...prev, stages: [...prev.stages, newStage] }));
  };

  const handleStageRemove = (stageId) => {
    setState((prev) => ({ ...prev, stages: prev.stages.filter((stage) => stage.id !== stageId) }));
  };

  const handleZoneChange = (zoneId, patch) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
    }));
  };

  const handleZoneAdd = () => {
    const id = `zone-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      zones: [...prev.zones, { id, name: 'Новая зона', color: '#6366f1' }],
    }));
  };

  const handleZoneRemove = (zoneId) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.filter((zone) => zone.id !== zoneId),
      stages: prev.stages.map((stage) => {
        if (stage.zoneId !== zoneId) return stage;
        const fallback = prev.zones.find((zone) => zone.id !== zoneId)?.id ?? stage.zoneId;
        return { ...stage, zoneId: fallback };
      }),
    }));
  };

  const handleLeverToggle = (leverId) => {
    setActiveLevers((prev) => {
      const next = new Set(prev);
      if (next.has(leverId)) {
        next.delete(leverId);
      } else {
        next.add(leverId);
      }
      return next;
    });
  };

  const handleFinancesChange = (patch) => {
    setState((prev) => ({ ...prev, finances: { ...prev.finances, ...patch } }));
  };

  const handleScenarioChange = (nextScenarioId) => {
    setScenarioId(nextScenarioId);
  };

  const handleTasksChange = (stageId, tasks) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => (stage.id === stageId ? { ...stage, tasks } : stage)),
    }));
  };

  const handleNoteChange = (stageId, note) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => (stage.id === stageId ? { ...stage, note } : stage)),
    }));
  };

  const exportJson = () => {
    const payload = {
      presetId,
      scenarioId,
      state,
      activeLevers: Array.from(activeLevers),
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${presetId}-funnel.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importJson = async (file) => {
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.csv')) {
      const rows = text.trim().split(/\r?\n/);
      const [headerLine, ...values] = rows;
      const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
      const nameIdx = headers.indexOf('stage');
      const conversionIdx = headers.indexOf('conversion');
      const noteIdx = headers.indexOf('note');
      const stagesPatch = state.stages.map((stage, index) => {
        const row = values[index]?.split(',');
        if (!row) return stage;
        return {
          ...stage,
          name: nameIdx >= 0 ? row[nameIdx] ?? stage.name : stage.name,
          conversion:
            conversionIdx >= 0 && stage.mode !== 'absolute'
              ? Number(row[conversionIdx] ?? stage.conversion)
              : stage.conversion,
          note: noteIdx >= 0 ? row[noteIdx] ?? stage.note : stage.note,
        };
      });
      setState((prev) => ({ ...prev, stages: stagesPatch }));
      return;
    }
    const payload = JSON.parse(text);
    if (payload?.state) {
      setPresetId(payload.presetId ?? presetId);
      setState(payload.state);
      setScenarioId(payload.scenarioId ?? payload.state?.scenarios?.[0]?.id ?? fallbackScenario.id);
      setActiveLevers(new Set(payload.activeLevers ?? []));
    }
  };

  const exportTasks = (format = 'json') => {
    const tasks = state.stages.flatMap((stage) =>
      (stage.tasks ?? []).map((task) => ({
        stageId: stage.id,
        stageName: stage.name,
        text: task.text,
        done: task.done,
      })),
    );
    if (format === 'csv') {
      const header = 'stageId,stageName,text,done';
      const rows = tasks.map((task) => `${task.stageId},${task.stageName.replace(/,/g, ';')},${task.text.replace(/,/g, ';')},${task.done}`);
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${presetId}-tasks.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${presetId}-tasks.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const startPresentation = () => {
    setPresentation(true);
  };

  const stopPresentation = () => {
    setPresentation(false);
    setPresentationIndex(null);
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ru' ? 'en' : 'ru'));
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1440px] px-6 pb-24">
        <header className="flex flex-wrap items-center gap-4 border-b border-slate-800 py-6">
          <div className="flex items-center gap-2 text-xl font-semibold text-slate-50">
            <span className="text-3xl">{state.logo ?? '📈'}</span>
            <div>
              <div>{state.name}</div>
              <p className="text-sm text-slate-400">{state.description}</p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>{t.preset}</span>
              <select
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
              >
                {presetLibrary.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.logo ?? '•'} {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm hover:border-slate-500"
            >
              <LanguageIcon className="h-4 w-4" /> {t.toggleLang}
            </button>
            <button
              onClick={exportJson}
              className="flex items-center gap-2 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-500/20"
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> {t.exportJson}
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20">
              <ArrowUpTrayIcon className="h-4 w-4" /> {t.importJson}
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    importJson(file);
                    event.target.value = '';
                  }
                }}
              />
            </label>
            <button
              onClick={presentation ? stopPresentation : startPresentation}
              className={clsx(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition',
                presentation
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                  : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20',
              )}
            >
              {presentation ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}{' '}
              {presentation ? t.stop : t.presentation}
            </button>
          </div>
        </header>

        <ScenarioTabs
          label={t.scenario}
          scenarios={state.scenarios}
          activeScenarioId={scenarioId}
          onScenarioChange={handleScenarioChange}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="funnel-gradient rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-indigo-950/40">
              <FunnelSVG
                stages={stageMetrics}
                zones={state.zones}
                presentationIndex={presentationIndex}
                focusedStageId={focusedStageId}
                onStageFocus={setFocusedStageId}
              />
              <InsightsPanel metrics={metrics} zones={state.zones} />
            </div>

            <KPIs
              title={t.kpi}
              metrics={metrics}
              finances={state.finances}
              onFinancesChange={handleFinancesChange}
            />

            <Editor
              title={t.editor}
              stages={state.stages.map((stage) => {
                const metric = stageMetrics.find((item) => item.id === stage.id);
                const previousMetric = metric && metric.index > 0 ? stageMetrics[metric.index - 1] : null;
                return {
                  ...stage,
                  drop: metric?.drop ?? 0,
                  baseValue: metric?.baseValue ?? stage.value,
                  improvedValue: metric?.improvedValue ?? stage.value,
                  baseConversion: metric?.baseConversion ?? stage.conversion,
                  improvedConversion: metric?.improvedConversion ?? stage.conversion,
                  previousBaseValue: previousMetric?.baseValue ?? null,
                };
              })}
              zones={state.zones}
              onStageChange={handleStageChange}
              onStageAdd={handleStageAdd}
              onStageRemove={handleStageRemove}
              onNoteChange={handleNoteChange}
              onFocusStage={setFocusedStageId}
            />
          </section>

          <aside className="space-y-6">
            <Levers
              title={t.levers}
              levers={state.levers}
              activeLevers={activeLevers}
              onToggle={handleLeverToggle}
              stages={stageMetrics}
            />
            <ZonesEditor
              title={t.zones}
              zones={state.zones}
              onZoneChange={handleZoneChange}
              onZoneAdd={handleZoneAdd}
              onZoneRemove={handleZoneRemove}
            />
            <NotesTasks
              title={t.notes}
              stages={state.stages}
              onTasksChange={handleTasksChange}
              onExportTasks={exportTasks}
              onFocusStage={setFocusedStageId}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default App;
