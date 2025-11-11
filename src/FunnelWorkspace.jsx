import { useEffect, useMemo, useState } from 'react';
import { presets as presetLibrary } from './data/presets.js';
import FunnelSVG from './components/FunnelSVG.jsx';
import Editor from './components/Editor.jsx';
import KPIs from './components/KPIs.jsx';
import Levers from './components/Levers.jsx';
import ZonesEditor from './components/ZonesEditor.jsx';
import ScenarioTabs from './components/ScenarioTabs.jsx';
import ScenarioSummary from './components/ScenarioSummary.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import NotesTasks from './components/NotesTasks.jsx';
import Stakeholders from './components/Stakeholders.jsx';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, LanguageIcon, PlayIcon, StopIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import FunnelComparison from './components/FunnelComparison.jsx';
import {
  calculateMetrics,
  fallbackScenario,
  getScenarioMeta,
  loadPreset,
  normalizeState,
} from './utils/funnel.js';

const translations = {
  ru: {
    preset: 'Пресет',
    scenario: 'Сценарии',
    exportJson: 'Экспорт JSON',
    importJson: 'Импорт JSON/CSV',
    languageLabel: 'Язык',
    languageName: 'Русский',
    kpi: 'KPI и финансы',
    editor: 'Этапы воронки',
    levers: 'Левериджи',
    leversSubtitle: 'плюсики роста',
    leverStageLabel: 'Этап',
    leverActiveLabel: 'Включено',
    leverActivateLabel: 'Активировать',
    leverImprovedLabel: 'Улучшенный выход',
    leverEmptyLabel: 'Для пресета пока нет левериджей.',
    zones: 'Зоны',
    insights: 'Инсайты',
    notes: 'Задачи и заметки',
    presentation: 'Режим презентации',
    stop: 'Стоп',
    newStage: 'Новый этап',
    stakeholders: 'ЛПР и их KPI',
    stakeholdersBaseLabel: 'База',
    stakeholdersDeltaZero: 'Δ 0',
    stakeholdersFocusLabel: 'Фокус улучшений',
    newWorkspace: 'Новая карточка',
    logoPlaceholder: 'Эмодзи',
    namePlaceholder: 'Компания или продукт',
    descriptionPlaceholder: 'Описание или позиционирование',
    mode: 'Режим',
    builderMode: 'Конструктор',
    compareMode: 'Сравнение воронок',
    comparisonTitle: 'Сравнение воронок',
    comparisonSubtitle: 'Загрузите две стратегии, чтобы сравнить стоимость, скорость и уверенность.',
    comparisonBack: 'Назад в конструктор',
    comparisonLeftLabel: 'Воронка А',
    comparisonRightLabel: 'Воронка Б',
    comparisonSelectPreset: 'Выбрать пресет',
    comparisonSelectPlaceholder: 'Выберите пресет',
    comparisonUseCurrent: 'Использовать текущую',
    comparisonImportLabel: 'Импорт JSON',
    comparisonSummaryTitle: 'Итоги сравнения',
    comparisonMissingData: 'Загрузите обе воронки, чтобы увидеть сравнительный анализ.',
    comparisonSummaryCost: 'Где дешевле войти',
    comparisonSummaryEase: 'Где проще запустить',
    comparisonSummaryResult: 'Где выше результат',
    comparisonSummarySpeed: 'Где быстрее эффект',
    comparisonSummaryConfidence: 'Где выше уверенность',
    comparisonSummaryTie: 'Показатель сравним для обеих воронок.',
    comparisonWinnerPrefix: 'лидирует',
    comparisonVersus: 'против',
    comparisonCurrencySuffix: '₽',
    comparisonMonthShort: 'мес.',
    comparisonImmediate: 'Сразу',
    comparisonConfidenceIndex: 'Индекс уверенности',
    comparisonConfidenceUnit: '/10',
    comparisonStatsTitle: 'Карточки воронок',
    comparisonStatsStages: 'Этапы',
    comparisonStatsLevers: 'Левериджи',
    comparisonStatsTasks: 'Задачи',
    comparisonStatsBudgetShare: 'Доля бюджета',
    comparisonStatsSpend: 'Расходы',
    comparisonStatsROI: 'ROI',
    comparisonStatsPayback: 'Окупаемость',
    comparisonStatsRevenue: 'Выручка',
    comparisonCurrentLabel: 'Текущая воронка',
    comparisonUnknownName: 'Без названия',
    comparisonFileError: 'Не удалось прочитать файл. Проверьте формат.',
    comparisonComplexityIndex: 'Индекс сложности',
  },
  en: {
    preset: 'Preset',
    scenario: 'Scenarios',
    exportJson: 'Export JSON',
    importJson: 'Import JSON/CSV',
    languageLabel: 'Language',
    languageName: 'English',
    kpi: 'KPIs & Finance',
    editor: 'Funnel stages',
    levers: 'Growth levers',
    leversSubtitle: 'growth boosts',
    leverStageLabel: 'Stage',
    leverActiveLabel: 'Enabled',
    leverActivateLabel: 'Activate',
    leverImprovedLabel: 'Improved output',
    leverEmptyLabel: 'No levers for this preset yet.',
    zones: 'Zones',
    insights: 'Insights',
    notes: 'Tasks & notes',
    presentation: 'Presentation mode',
    stop: 'Stop',
    newStage: 'New stage',
    stakeholders: 'Decision makers & KPIs',
    stakeholdersBaseLabel: 'Base',
    stakeholdersDeltaZero: 'Δ 0',
    stakeholdersFocusLabel: 'Improvement focus',
    newWorkspace: 'New card',
    logoPlaceholder: 'Emoji',
    namePlaceholder: 'Company or product',
    descriptionPlaceholder: 'Description or positioning',
    mode: 'Mode',
    builderMode: 'Workspace',
    compareMode: 'Funnel comparison',
    comparisonTitle: 'Funnel comparison',
    comparisonSubtitle: 'Load two funnels to compare cost, speed, and confidence.',
    comparisonBack: 'Back to workspace',
    comparisonLeftLabel: 'Funnel A',
    comparisonRightLabel: 'Funnel B',
    comparisonSelectPreset: 'Choose preset',
    comparisonSelectPlaceholder: 'Select a preset',
    comparisonUseCurrent: 'Use current funnel',
    comparisonImportLabel: 'Import JSON',
    comparisonSummaryTitle: 'Summary',
    comparisonMissingData: 'Load two funnels to see the comparative insights.',
    comparisonSummaryCost: 'Cheapest entry',
    comparisonSummaryEase: 'Easiest to launch',
    comparisonSummaryResult: 'Best outcome',
    comparisonSummarySpeed: 'Fastest effect',
    comparisonSummaryConfidence: 'Highest confidence',
    comparisonSummaryTie: 'Metric is comparable for both funnels.',
    comparisonWinnerPrefix: 'leads',
    comparisonVersus: 'vs',
    comparisonCurrencySuffix: '₽',
    comparisonMonthShort: 'mo',
    comparisonImmediate: 'Immediate',
    comparisonConfidenceIndex: 'Confidence index',
    comparisonConfidenceUnit: '/10',
    comparisonStatsTitle: 'Funnel cards',
    comparisonStatsStages: 'Stages',
    comparisonStatsLevers: 'Levers',
    comparisonStatsTasks: 'Tasks',
    comparisonStatsBudgetShare: 'Budget share',
    comparisonStatsSpend: 'Spend',
    comparisonStatsROI: 'ROI',
    comparisonStatsPayback: 'Payback',
    comparisonStatsRevenue: 'Revenue',
    comparisonCurrentLabel: 'Current funnel',
    comparisonUnknownName: 'Untitled',
    comparisonFileError: 'Unable to read file. Check the format.',
    comparisonComplexityIndex: 'Complexity index',
  },
  de: {
    preset: 'Preset',
    scenario: 'Szenarien',
    exportJson: 'JSON exportieren',
    importJson: 'JSON/CSV importieren',
    languageLabel: 'Sprache',
    languageName: 'Deutsch',
    kpi: 'KPIs & Finanzen',
    editor: 'Funnel-Stufen',
    levers: 'Hebel',
    leversSubtitle: 'Wachstums-Boosts',
    leverStageLabel: 'Stufe',
    leverActiveLabel: 'Aktiv',
    leverActivateLabel: 'Aktivieren',
    leverImprovedLabel: 'Verbesserter Output',
    leverEmptyLabel: 'Für dieses Preset sind keine Hebel hinterlegt.',
    zones: 'Zonen',
    insights: 'Insights',
    notes: 'Aufgaben & Notizen',
    presentation: 'Präsentationsmodus',
    stop: 'Stop',
    newStage: 'Neue Stufe',
    stakeholders: 'Entscheider & KPIs',
    stakeholdersBaseLabel: 'Basis',
    stakeholdersDeltaZero: 'Δ 0',
    stakeholdersFocusLabel: 'Verbesserungsfokus',
    newWorkspace: 'Neue Karte',
    logoPlaceholder: 'Emoji',
    namePlaceholder: 'Unternehmen oder Produkt',
    descriptionPlaceholder: 'Beschreibung oder Positionierung',
    mode: 'Modus',
    builderMode: 'Arbeitsmodus',
    compareMode: 'Funnel-Vergleich',
    comparisonTitle: 'Funnel-Vergleich',
    comparisonSubtitle: 'Lade zwei Funnels, um Kosten, Geschwindigkeit und Sicherheit zu vergleichen.',
    comparisonBack: 'Zurück zum Workspace',
    comparisonLeftLabel: 'Funnel A',
    comparisonRightLabel: 'Funnel B',
    comparisonSelectPreset: 'Preset wählen',
    comparisonSelectPlaceholder: 'Preset auswählen',
    comparisonUseCurrent: 'Aktuellen verwenden',
    comparisonImportLabel: 'JSON importieren',
    comparisonSummaryTitle: 'Vergleich',
    comparisonMissingData: 'Lade zwei Funnels, um den Vergleich zu sehen.',
    comparisonSummaryCost: 'Günstigster Einstieg',
    comparisonSummaryEase: 'Leichtester Start',
    comparisonSummaryResult: 'Bestes Ergebnis',
    comparisonSummarySpeed: 'Schnellster Effekt',
    comparisonSummaryConfidence: 'Höchste Sicherheit',
    comparisonSummaryTie: 'Kennzahl ist bei beiden Funnels ähnlich.',
    comparisonWinnerPrefix: 'führt',
    comparisonVersus: 'gegen',
    comparisonCurrencySuffix: '₽',
    comparisonMonthShort: 'Mon.',
    comparisonImmediate: 'Sofort',
    comparisonConfidenceIndex: 'Sicherheitsindex',
    comparisonConfidenceUnit: '/10',
    comparisonStatsTitle: 'Funnel-Karten',
    comparisonStatsStages: 'Phasen',
    comparisonStatsLevers: 'Hebel',
    comparisonStatsTasks: 'Aufgaben',
    comparisonStatsBudgetShare: 'Budgetanteil',
    comparisonStatsSpend: 'Ausgaben',
    comparisonStatsROI: 'ROI',
    comparisonStatsPayback: 'Amortisation',
    comparisonStatsRevenue: 'Umsatz',
    comparisonCurrentLabel: 'Aktueller Funnel',
    comparisonUnknownName: 'Ohne Titel',
    comparisonFileError: 'Datei konnte nicht gelesen werden. Format prüfen.',
    comparisonComplexityIndex: 'Komplexitätsindex',
  },
  zh: {
    preset: '预设',
    scenario: '情景',
    exportJson: '导出 JSON',
    importJson: '导入 JSON/CSV',
    languageLabel: '语言',
    languageName: '中文',
    kpi: '关键指标与财务',
    editor: '漏斗阶段',
    levers: '增长杠杆',
    leversSubtitle: '增长加成',
    leverStageLabel: '阶段',
    leverActiveLabel: '已启用',
    leverActivateLabel: '启用',
    leverImprovedLabel: '改进后输出',
    leverEmptyLabel: '此预设暂无杠杆。',
    zones: '区域',
    insights: '洞察',
    notes: '任务与笔记',
    presentation: '演示模式',
    stop: '停止',
    newStage: '新阶段',
    stakeholders: '决策人及其 KPI',
    stakeholdersBaseLabel: '基线',
    stakeholdersDeltaZero: 'Δ 0',
    stakeholdersFocusLabel: '改进重点',
    newWorkspace: '新卡片',
    logoPlaceholder: '表情',
    namePlaceholder: '公司或产品',
    descriptionPlaceholder: '描述或定位',
    mode: '模式',
    builderMode: '工作区',
    compareMode: '漏斗对比',
    comparisonTitle: '漏斗对比',
    comparisonSubtitle: '加载两个漏斗以对比成本、速度和确定性。',
    comparisonBack: '返回工作区',
    comparisonLeftLabel: '漏斗 A',
    comparisonRightLabel: '漏斗 B',
    comparisonSelectPreset: '选择预设',
    comparisonSelectPlaceholder: '请选择预设',
    comparisonUseCurrent: '使用当前漏斗',
    comparisonImportLabel: '导入 JSON',
    comparisonSummaryTitle: '对比总结',
    comparisonMissingData: '请加载两个漏斗以查看对比分析。',
    comparisonSummaryCost: '进入成本更低',
    comparisonSummaryEase: '更容易落地',
    comparisonSummaryResult: '结果更好',
    comparisonSummarySpeed: '见效更快',
    comparisonSummaryConfidence: '确定性更高',
    comparisonSummaryTie: '该指标在两个漏斗中相近。',
    comparisonWinnerPrefix: '领先',
    comparisonVersus: '对比',
    comparisonCurrencySuffix: '₽',
    comparisonMonthShort: '月',
    comparisonImmediate: '即刻',
    comparisonConfidenceIndex: '信心指数',
    comparisonConfidenceUnit: '/10',
    comparisonStatsTitle: '漏斗卡',
    comparisonStatsStages: '阶段',
    comparisonStatsLevers: '增长杠杆',
    comparisonStatsTasks: '任务',
    comparisonStatsBudgetShare: '预算占比',
    comparisonStatsSpend: '投入',
    comparisonStatsROI: 'ROI',
    comparisonStatsPayback: '回本周期',
    comparisonStatsRevenue: '收入',
    comparisonCurrentLabel: '当前漏斗',
    comparisonUnknownName: '未命名',
    comparisonFileError: '无法读取文件，请检查格式。',
    comparisonComplexityIndex: '复杂度指数',
  },
};

const languageOptions = Object.entries(translations).map(([code, value]) => ({
  code,
  label: value.languageName,
}));


function FunnelWorkspace() {
  const initialPreset = useMemo(() => presetLibrary[0] ?? {}, []);
  const initialState = useMemo(() => loadPreset(initialPreset), [initialPreset]);
  const initialScenarioId = initialState.scenarios?.[0]?.id ?? fallbackScenario.id;
  const initialLanguage = (() => {
    const candidate = initialState.locale ?? initialPreset.locale;
    if (candidate && translations[candidate]) {
      return candidate;
    }
    return 'ru';
  })();

  const [language, setLanguage] = useState(initialLanguage);
  const [presetId, setPresetId] = useState(initialPreset.id ?? initialState.id ?? 'custom');
  const [state, setState] = useState(initialState);
  const [scenarioId, setScenarioId] = useState(initialScenarioId);
  const [activeLevers, setActiveLevers] = useState(() => new Set());
  const [focusedStageId, setFocusedStageId] = useState(null);
  const [presentation, setPresentation] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(null);
  const [viewMode, setViewMode] = useState('builder');

  const applyPreset = (id) => {
    const preset = presetLibrary.find((item) => item.id === id) ?? presetLibrary[0];
    const loaded = loadPreset(preset);
    setPresetId(id);
    setState(loaded);
    setScenarioId(loaded.scenarios?.[0]?.id ?? fallbackScenario.id);
    setActiveLevers(new Set());
    setFocusedStageId(null);
    setPresentation(false);
    const localeCandidate = loaded.locale ?? preset?.locale;
    if (localeCandidate && translations[localeCandidate]) {
      setLanguage(localeCandidate);
    }
  };

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

  const handleMetaChange = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const handleCreateNewWorkspace = () => {
    const blank = presetLibrary.find((item) => item.id === 'custom');
    if (blank) {
      applyPreset(blank.id);
      return;
    }
    const template = normalizeState({});
    setPresetId('custom');
    setState(template);
    setScenarioId(template.scenarios?.[0]?.id ?? fallbackScenario.id);
    setActiveLevers(new Set());
    setFocusedStageId(null);
    setPresentation(false);
    setLanguage('ru');
    setViewMode('builder');
  };

  const currentScenario = useMemo(() => {
    return state.scenarios?.find((scenario) => scenario.id === scenarioId) ?? fallbackScenario;
  }, [scenarioId, state.scenarios]);

  const scenarioMeta = useMemo(() => getScenarioMeta(currentScenario, state.trafficChannels), [currentScenario, state.trafficChannels]);

  const localeMap = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', zh: 'zh-CN' };
  const locale = localeMap[language] ?? 'ru-RU';
  const numberFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    } catch (error) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
    }
  }, [locale]);

  const metrics = useMemo(
    () =>
      calculateMetrics({
        state,
        scenario: currentScenario,
        scenarioMeta,
        activeLevers,
        numberFormatter,
      }),
    [state, currentScenario, scenarioMeta, activeLevers, numberFormatter],
  );

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
      name: translations[language]?.newStage ?? 'New stage',
      mode: 'percent',
      value: previous ? Math.round(previous.value * 0.6) : 1000,
      conversion: 60,
      benchmark: 60,
      note: '',
      zoneId: zoneId ?? previous?.zoneId ?? state.zones[0]?.id,
      tasks: [],
      trafficChannels: [],
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
      language,
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
      const normalized = normalizeState(payload.state);
      if (payload.presetId && payload.presetId !== presetId) {
        setPresetId(payload.presetId);
      }
      setState(normalized);
      setScenarioId(payload.scenarioId ?? normalized.scenarios?.[0]?.id ?? fallbackScenario.id);
      setActiveLevers(new Set(payload.activeLevers ?? []));
      const localeCandidate = payload.language ?? normalized.locale;
      if (localeCandidate && translations[localeCandidate]) {
        setLanguage(localeCandidate);
      }
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

  const t = translations[language] ?? translations.ru;
  const comparisonStrings = useMemo(
    () => ({
      title: t.comparisonTitle,
      subtitle: t.comparisonSubtitle,
      backToBuilder: t.comparisonBack,
      leftLabel: t.comparisonLeftLabel,
      rightLabel: t.comparisonRightLabel,
      selectPreset: t.comparisonSelectPreset,
      selectPresetPlaceholder: t.comparisonSelectPlaceholder,
      useCurrent: t.comparisonUseCurrent,
      importLabel: t.comparisonImportLabel,
      summaryTitle: t.comparisonSummaryTitle,
      missingData: t.comparisonMissingData,
      summaryCost: t.comparisonSummaryCost,
      summaryEase: t.comparisonSummaryEase,
      summaryResult: t.comparisonSummaryResult,
      summarySpeed: t.comparisonSummarySpeed,
      summaryConfidence: t.comparisonSummaryConfidence,
      summaryTie: t.comparisonSummaryTie,
      winnerPrefix: t.comparisonWinnerPrefix,
      versus: t.comparisonVersus,
      currencySuffix: t.comparisonCurrencySuffix,
      monthShort: t.comparisonMonthShort,
      immediate: t.comparisonImmediate,
      confidenceLabel: t.comparisonConfidenceIndex,
      confidenceUnit: t.comparisonConfidenceUnit,
      statsTitle: t.comparisonStatsTitle,
      statsStages: t.comparisonStatsStages,
      statsLevers: t.comparisonStatsLevers,
      statsTasks: t.comparisonStatsTasks,
      statsBudgetShare: t.comparisonStatsBudgetShare,
      statsSpend: t.comparisonStatsSpend,
      statsROI: t.comparisonStatsROI,
      statsPayback: t.comparisonStatsPayback,
      statsRevenue: t.comparisonStatsRevenue,
      currentFunnelLabel: t.comparisonCurrentLabel,
      unknownName: t.comparisonUnknownName,
      fileError: t.comparisonFileError,
      complexityLabel: t.comparisonComplexityIndex,
    }),
    [t],
  );

  return (
    <>
        <header className="flex flex-wrap items-start gap-4 border-b border-slate-800 py-6">
          <div className="flex flex-wrap items-center gap-3 text-xl font-semibold text-slate-50">
            <input
              value={state.logo ?? ''}
              onChange={(event) => handleMetaChange({ logo: event.target.value })}
              placeholder={t.logoPlaceholder}
              maxLength={4}
              className="h-14 w-16 rounded-xl border border-slate-700 bg-slate-900/70 text-center text-3xl text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex min-w-[240px] flex-col gap-2">
              <input
                value={state.name ?? ''}
                onChange={(event) => handleMetaChange({ name: event.target.value })}
                placeholder={t.namePlaceholder}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-lg font-semibold text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
              <input
                value={state.description ?? ''}
                onChange={(event) => handleMetaChange({ description: event.target.value })}
                placeholder={t.descriptionPlaceholder}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-300 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <button
              onClick={handleCreateNewWorkspace}
              className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-500/20 active:scale-95"
            >
              <PlusCircleIcon className="h-4 w-4" /> {t.newWorkspace}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>{t.mode}</span>
              <select
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm"
                value={viewMode}
                onChange={(event) => {
                  const nextMode = event.target.value;
                  setViewMode(nextMode);
                  if (nextMode === 'compare') {
                    setPresentation(false);
                    setPresentationIndex(null);
                  }
                }}
              >
                <option value="builder">{t.builderMode}</option>
                <option value="compare">{t.compareMode}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>{t.preset}</span>
              <select
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm"
                value={presetId}
                onChange={(event) => applyPreset(event.target.value)}
              >
                {presetLibrary.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.logo ?? '•'} {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <LanguageIcon className="h-4 w-4" /> {t.languageLabel}
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm"
              >
                {languageOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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

        {viewMode === 'compare' ? (
          <FunnelComparison
            presets={presetLibrary}
            currentState={state}
            locale={locale}
            strings={comparisonStrings}
            onExit={() => setViewMode('builder')}
          />
        ) : (
          <>
            <ScenarioTabs
              label={t.scenario}
              scenarios={state.scenarios}
              activeScenarioId={scenarioId}
              onScenarioChange={handleScenarioChange}
            />

            <ScenarioSummary scenario={currentScenario} metrics={metrics} locale={locale} />

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="space-y-6">
                <div className="funnel-gradient card-animated rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-indigo-950/40">
                  <FunnelSVG
                    stages={stageMetrics}
                    zones={state.zones}
                    presentationIndex={presentationIndex}
                    focusedStageId={focusedStageId}
                    onStageFocus={setFocusedStageId}
                    locale={locale}
                  />
                  <InsightsPanel metrics={metrics} zones={state.zones} locale={locale} trafficChannels={metrics.trafficMix} />
                  <Stakeholders
                    title={t.stakeholders}
                    stakeholders={state.stakeholders}
                    metrics={metrics}
                    locale={locale}
                    strings={{
                      baseLabel: t.stakeholdersBaseLabel,
                      deltaZero: t.stakeholdersDeltaZero,
                      focusLabel: t.stakeholdersFocusLabel,
                    }}
                  />
                </div>

                <KPIs
                  title={t.kpi}
                  metrics={metrics}
                  finances={state.finances}
                  onFinancesChange={handleFinancesChange}
                  locale={locale}
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
                  locale={locale}
                />
              </section>

              <aside className="space-y-6">
                <Levers
                  title={t.levers}
                  subtitle={t.leversSubtitle}
                  levers={state.levers}
                  activeLevers={activeLevers}
                  onToggle={handleLeverToggle}
                  stages={stageMetrics}
                  locale={locale}
                  strings={{
                    stageLabel: t.leverStageLabel,
                    active: t.leverActiveLabel,
                    activate: t.leverActivateLabel,
                    improvedOutput: t.leverImprovedLabel,
                    empty: t.leverEmptyLabel,
                  }}
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
          </>
        )}
    </>
  );
}

export default FunnelWorkspace;
