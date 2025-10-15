import { defaultZones } from '../data/presets.js';

export function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? {}));
}

export const fallbackScenario = { id: 'base', name: 'Base', adjustments: {} };

export function normalizeTrafficChannel(channel, index, prefix = 'traffic') {
  const numericShare = Number(channel?.share);
  return {
    id: channel?.id ?? `${prefix}-${index}`,
    name: channel?.name ?? '',
    share: Number.isFinite(numericShare) ? numericShare : 0,
    note: channel?.note ?? '',
  };
}

export function normalizeStage(stage, index) {
  const id = stage?.id ?? `stage-${index}`;
  const numericValue = Number(stage?.value);
  const numericConversion = Number(stage?.conversion);
  const numericBenchmark = Number(stage?.benchmark);
  const mode = stage?.mode === 'absolute' ? 'absolute' : 'percent';
  return {
    id,
    name: stage?.name ?? `Stage ${index + 1}`,
    mode,
    value: Number.isFinite(numericValue) ? numericValue : 0,
    conversion:
      mode === 'absolute'
        ? Number.isFinite(numericConversion)
          ? numericConversion
          : 100
        : Number.isFinite(numericConversion)
          ? numericConversion
          : 0,
    benchmark: Number.isFinite(numericBenchmark) ? numericBenchmark : null,
    zoneId: stage?.zoneId ?? 'marketing',
    note: stage?.note ?? '',
    tasks: (stage?.tasks ?? []).map((task, taskIndex) => ({
      id: task?.id ?? `${id}-task-${taskIndex}`,
      text: task?.text ?? '',
      done: Boolean(task?.done),
    })),
    trafficChannels: (stage?.trafficChannels ?? []).map((channel, channelIndex) =>
      normalizeTrafficChannel(channel, channelIndex, `${id}-traffic`),
    ),
  };
}

export function normalizeState(input, zonesFallback = defaultZones) {
  const clone = deepClone(input ?? {});
  const zones = clone.zones?.length ? clone.zones : deepClone(zonesFallback);
  const finances = clone.finances ?? {};
  const parseNumeric = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  return {
    id: clone.id ?? 'custom',
    name: clone.name ?? '',
    description: clone.description ?? '',
    logo: clone.logo ?? '📈',
    stages: (clone.stages ?? []).map((stage, index) => normalizeStage(stage, index)),
    zones: zones.map((zone, index) => ({
      id: zone.id ?? `zone-${index}`,
      name: zone.name ?? `Zone ${index + 1}`,
      color: zone.color ?? '#1d4ed8',
    })),
    levers: (clone.levers ?? []).map((lever, index) => ({
      ...lever,
      id: lever.id ?? `lever-${index}`,
    })),
    finances: {
      avgCheck: parseNumeric(finances.avgCheck),
      cpl: parseNumeric(finances.cpl),
      cac: parseNumeric(finances.cac),
      ltv: parseNumeric(finances.ltv),
    },
    scenarios: (clone.scenarios?.length ? clone.scenarios : [fallbackScenario]).map((scenario, index) => ({
      ...scenario,
      id: scenario.id ?? `scenario-${index}`,
      name: scenario.name ?? `Scenario ${index + 1}`,
      adjustments: scenario.adjustments ?? {},
      zones: scenario.zones ?? {},
      plays: scenario.plays ?? [],
    })),
    trafficChannels: (clone.trafficChannels ?? []).map((channel, index) => normalizeTrafficChannel(channel, index)),
    stakeholders: clone.stakeholders ?? [],
    locale: clone.locale,
  };
}

export function loadPreset(preset) {
  return normalizeState(preset);
}

export function normalizeShares(channels) {
  if (!channels?.length) return [];
  const total = channels.reduce((sum, channel) => sum + Math.max(0, Number(channel.share ?? 0)), 0);
  let remainder = 100;
  return channels.map((channel, index) => {
    const baseShare = total > 0 ? (Math.max(0, Number(channel.share ?? 0)) / total) * 100 : 100 / channels.length;
    const value = index === channels.length - 1 ? Math.max(0, remainder) : Math.min(remainder, Math.round(baseShare));
    remainder -= value;
    return {
      ...channel,
      id: channel.id ?? `traffic-${index}`,
      share: Number.isFinite(value) ? value : 0,
    };
  });
}

export function emphasizeByRank(channels, { top = 2, boost = 1.2, tail = 0.9 } = {}) {
  if (!channels?.length) return [];
  const normalized = normalizeShares(channels);
  const indices = normalized
    .map((channel, index) => ({ index, share: channel.share ?? 0 }))
    .sort((a, b) => b.share - a.share)
    .map((item) => item.index);
  const weights = normalized.map(() => tail);
  indices.forEach((index, position) => {
    weights[index] = position < top ? boost : tail;
  });
  const weighted = normalized.map((channel, index) => ({
    ...channel,
    share: (channel.share ?? 0) * (weights[index] ?? 1),
  }));
  return normalizeShares(weighted);
}

export function emphasizeKeywords(
  channels,
  { positivePattern, positiveWeight = 1.25, fallbackWeight = 0.9 } = {},
) {
  if (!channels?.length) return [];
  const normalized = normalizeShares(channels);
  const weighted = normalized.map((channel, index) => {
    const identifier = `${channel.id ?? ''} ${channel.name ?? ''}`.toLowerCase();
    const isPositive = positivePattern?.test(identifier) ?? false;
    return {
      ...channel,
      share: (channel.share ?? 0) * (isPositive ? positiveWeight : fallbackWeight),
      id: channel.id ?? `traffic-${index}`,
    };
  });
  return normalizeShares(weighted);
}

export function getBudgetClassification(share) {
  if (share == null || Number.isNaN(share)) {
    return { label: '—', status: 'Нет данных по бюджету.' };
  }
  if (share < 0.05) {
    return { label: 'Критический минимум', status: 'Инвестиции <5% — маркетинг почти отсутствует.' };
  }
  if (share < 0.1) {
    return { label: 'На плаву', status: '5–10% от выручки — поддерживаем продажи и узнаваемость.' };
  }
  if (share < 0.15) {
    return { label: 'Умеренный рост', status: '10% от выручки — планомерно растим спрос.' };
  }
  return { label: 'Агрессивный рост', status: 'Более 15% — ставка на масштабирование и долю рынка.' };
}

export const scenarioArchetypeMeta = {
  base: {
    shareOfRevenue: 0.05,
    label: 'На плаву',
    status: '5% от выручки — поддерживаем стабильность воронки.',
    description: 'Базовый режим: держим основные каналы и фокус на эффективности.',
    plays: ['Тонкая настройка unit-экономики', 'Локальные эксперименты без резких вложений'],
    trafficStrategy: (channels) => normalizeShares(channels),
  },
  moderate: {
    shareOfRevenue: 0.1,
    label: 'Умеренный рост',
    status: '10% от выручки — активируем новые сегменты и эксперименты.',
    description: 'Подключаем дополнительные кампании и автоматизации для роста.',
    plays: ['Перезапуск лид-магнитов и контента', 'CRM-автоматизация nurture-цепочек'],
    trafficStrategy: (channels) => emphasizeByRank(channels, { top: 2, boost: 1.18, tail: 0.95 }),
  },
  aggressive: {
    shareOfRevenue: 0.18,
    label: 'Агрессивный рост',
    status: 'Инвестируем >15% выручки для быстрого масштабирования.',
    description: 'Ускоряем performance, ABM и product-led инициативы.',
    plays: ['Performance-спринты и ростовые эксперименты каждую неделю', 'Глубокая аналитика CAC/LTV и cohort management'],
    trafficStrategy: (channels) =>
      emphasizeKeywords(channels, {
        positivePattern: /(paid|performance|ads|abm|outbound|events|demand|growth|launch|promo)/i,
        positiveWeight: 1.35,
        fallbackWeight: 0.8,
      }),
  },
  land: {
    shareOfRevenue: 0.12,
    label: 'Land & Expand',
    status: '12% от выручки — удержание, лояльность и расширение внутри клиентов.',
    description: 'Customer marketing, upsell и программы рекомендаций становятся основой роста.',
    plays: ['Quarterly business review и customer marketing', 'Программы лояльности и петли рекомендаций'],
    trafficStrategy: (channels) =>
      emphasizeKeywords(channels, {
        positivePattern: /(retention|ref|loyal|crm|community|success|customer|advocacy|partner)/i,
        positiveWeight: 1.3,
        fallbackWeight: 0.9,
      }),
  },
  sales: {
    shareOfRevenue: 0.03,
    label: 'Только продажи',
    status: 'Маркетинг <5% — упор на SDR и холодные касания.',
    description: 'Маркетинг практически отсутствует: работаем через холодные продажи и партнерские сделки.',
    plays: ['Обновление SDR playbook и скриптов', 'Sales enablement вместо маркетинговых активностей'],
    trafficStrategy: () => [
      {
        id: 'cold-outbound',
        name: 'Холодный outbound',
        share: 55,
        note: 'SDR-каденции, LinkedIn outreach, звонки.',
      },
      {
        id: 'email-sequences',
        name: 'Email-серии и nurture',
        share: 25,
        note: 'Мультиканальные письма, автоматические follow-up.',
      },
      {
        id: 'partner-intros',
        name: 'Партнеры и выездные встречи',
        share: 20,
        note: 'Партнерские интро, демо на площадке клиента.',
      },
    ],
  },
};

export function detectScenarioArchetype(scenario) {
  if (!scenario) return 'base';
  const key = `${scenario.id ?? ''} ${scenario.name ?? ''}`.toLowerCase();
  if (/(sales|no-marketing|cold|outbound-only|bare|только продаж)/.test(key)) {
    return 'sales';
  }
  if (/(land|expand|retention|loyal|aftermarket|referral|alumni|service|telemed|enterprise|partner|grant|success|mastermind|loyalty|alliance)/.test(key)) {
    return 'land';
  }
  if (/(aggressive|hyper|scale|max|rocket|blitz|accelerate)/.test(key)) {
    return 'aggressive';
  }
  if (/(growth|improved|evergreen|launch|digitization|promo|telemed|service|boost|expansion|animation|productized|digitization)/.test(key)) {
    return 'moderate';
  }
  if (/(default|base|current|standard|steady|now|текущ)/.test(key)) {
    return 'base';
  }
  return 'moderate';
}

export function getScenarioMeta(scenario, fallbackChannels) {
  if (!scenario) {
    const meta = scenarioArchetypeMeta.base;
    return {
      shareOfRevenue: meta.shareOfRevenue,
      label: meta.label,
      status: meta.status,
      description: meta.description,
      plays: meta.plays,
      trafficMix: meta.trafficStrategy(fallbackChannels),
    };
  }
  const archetype = detectScenarioArchetype(scenario);
  const baseMeta = scenarioArchetypeMeta[archetype] ?? scenarioArchetypeMeta.base;
  const share = scenario.budget?.shareOfRevenue ?? baseMeta.shareOfRevenue;
  const classification = getBudgetClassification(share);
  const trafficMix = scenario.trafficMix?.length
    ? normalizeShares(scenario.trafficMix)
    : baseMeta.trafficStrategy(fallbackChannels);
  return {
    shareOfRevenue: share,
    label: scenario.budget?.label ?? baseMeta.label ?? classification.label,
    status: scenario.budget?.note ?? baseMeta.status ?? classification.status,
    description: scenario.description ?? baseMeta.description,
    plays: scenario.plays ?? baseMeta.plays,
    trafficMix,
  };
}

export const conversionFromValues = (current, previous) => {
  if (!previous || previous === 0) return 100;
  return (current / previous) * 100;
};

export function calculateMetrics({ state, scenario, scenarioMeta, activeLevers, numberFormatter }) {
  const scenarioAdjustments = scenario?.adjustments ?? {};
  const scenarioZoneAdjustments = scenario?.zones ?? {};
  const leverMap = (state.levers ?? []).reduce((acc, lever) => {
    if (activeLevers?.has?.(lever.id)) {
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
    const effectiveConversion =
      index === 0
        ? 100
        : stage.mode === 'percent'
          ? stage.conversion ?? conversionFromValues(stage.value, previousBaseValue ?? stage.value)
          : conversionFromValues(stage.value, previousBaseValue ?? stage.value);
    const zoneAdjustment = scenarioZoneAdjustments?.[stage.zoneId] ?? {};
    const scenarioBoost = (scenarioAdjustments?.[stage.id]?.conversion ?? 0) + (zoneAdjustment.conversion ?? 0);
    const scenarioValueBoost = (scenarioAdjustments?.[stage.id]?.value ?? 0) + (zoneAdjustment.value ?? 0);
    const leverBoost = leverMap?.[stage.id] ?? 0;

    const baseValue =
      index === 0 || stage.mode === 'absolute'
        ? stage.value
        : (previousBaseValue ?? 0) * (effectiveConversion / 100);

    const baseConversion =
      index === 0
        ? 100
        : stage.mode === 'absolute'
          ? conversionFromValues(stage.value, previousBaseValue ?? stage.value)
          : effectiveConversion;

    const improvedConversionRaw = index === 0 ? 100 + scenarioValueBoost : baseConversion + scenarioBoost + leverBoost;
    const improvedConversion =
      index === 0 && stage.mode === 'absolute'
        ? Math.max(1, improvedConversionRaw)
        : Math.max(0, Math.min(100, improvedConversionRaw));

    const improvedBase =
      index === 0
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

  const dealsBase = finalBase;
  const dealsImproved = finalImproved;
  const revenueBase = dealsBase * (state.finances?.avgCheck ?? 0);
  const revenueImproved = dealsImproved * (state.finances?.avgCheck ?? 0);
  const budgetShare = scenarioMeta?.shareOfRevenue ?? null;
  const spendBase =
    budgetShare != null
      ? revenueBase * budgetShare
      : marketingLeads * (state.finances?.cpl ?? 0);
  const spendImproved =
    budgetShare != null
      ? revenueImproved * budgetShare
      : improvedMarketingLeads * (state.finances?.cpl ?? 0);
  const cac = state.finances?.cac ?? 0;
  const ltv = state.finances?.ltv ?? 0;
  const grossMarginBase = revenueBase - spendBase - dealsBase * cac;
  const grossMarginImproved = revenueImproved - spendImproved - dealsImproved * cac;
  const roiBase = spendBase > 0 ? (grossMarginBase / spendBase) * 100 : 0;
  const roiImproved = spendImproved > 0 ? (grossMarginImproved / spendImproved) * 100 : 0;
  const paybackMonths = cac > 0 ? (state.finances?.avgCheck > 0 ? state.finances.avgCheck / cac : 0) : 0;

  const bottleneck = baseStages
    .slice(1)
    .reduce((worst, stage) => {
      if (!worst || stage.drop > worst.drop) return stage;
      return worst;
    }, null);

  const formatter = numberFormatter ?? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const insight = bottleneck
    ? `Самая большая потеря (${formatter.format(bottleneck.drop)}) на этапе «${bottleneck.name}». Улучшение конверсии на 5 п.п. даст дополнительно ~${formatter.format((baseStages[bottleneck.index - 1]?.baseValue ?? 0) * 0.05)} лидов.`
    : 'Воронка стабильна, улучшайте верх и удержание одновременно.';

  const retentionStages = baseStages.filter((stage) => stage.zoneId === 'retention');
  let churnRate = null;
  let churnRateImproved = null;
  let retentionSummary = null;

  if (retentionStages.length) {
    const firstRetention = retentionStages[0];
    const previousStage = firstRetention.index > 0 ? baseStages[firstRetention.index - 1] : null;
    const baseCustomers = previousStage?.baseValue ?? firstRetention.baseValue ?? 0;
    const lastRetention = retentionStages[retentionStages.length - 1];
    const retainedBase = lastRetention?.baseValue ?? 0;
    const retainedImproved = lastRetention?.improvedValue ?? retainedBase;

    if (baseCustomers > 0) {
      churnRate = Math.max(0, Math.min(100, ((baseCustomers - retainedBase) / baseCustomers) * 100));
      churnRateImproved = Math.max(
        0,
        Math.min(100, ((baseCustomers - retainedImproved) / baseCustomers) * 100),
      );
    } else {
      churnRate = 0;
      churnRateImproved = 0;
    }

    const loyalShare = baseCustomers > 0 ? Math.max(0, Math.min(100, (retainedBase / baseCustomers) * 100)) : 0;
    const loyalShareImproved =
      baseCustomers > 0 ? Math.max(0, Math.min(100, (retainedImproved / baseCustomers) * 100)) : loyalShare;
    const atRiskShare = Math.max(0, Math.min(100, (churnRate ?? 0) * 0.55));
    const atRiskShareImproved = Math.max(0, Math.min(100, (churnRateImproved ?? 0) * 0.45));
    const sleepingShare = Math.max(0, Math.min(100, 100 - loyalShare - atRiskShare - (churnRate ?? 0)));
    const sleepingShareImproved = Math.max(
      0,
      Math.min(100, 100 - loyalShareImproved - atRiskShareImproved - (churnRateImproved ?? 0)),
    );

    retentionSummary = {
      baseCustomers,
      loyalShare,
      loyalShareImproved,
      atRiskShare,
      atRiskShareImproved,
      sleepingShare,
      sleepingShareImproved,
      churnRate: churnRate ?? 0,
      churnRateImproved: churnRateImproved ?? 0,
    };
  }

  return {
    stages: baseStages,
    topValue,
    finalBase,
    finalImproved,
    deltaUnits,
    deltaPercent,
    spendBase,
    spendImproved,
    marketingBudgetShare: budgetShare,
    marketingBudgetLabel: scenarioMeta?.label,
    marketingBudgetStatus: scenarioMeta?.status,
    scenarioDescription: scenarioMeta?.description,
    scenarioPlays: scenarioMeta?.plays,
    trafficMix: scenarioMeta?.trafficMix,
    revenueBase,
    revenueImproved,
    roiBase,
    roiImproved,
    paybackMonths,
    grossMarginBase,
    grossMarginImproved,
    bottleneck,
    insight,
    churnRate,
    churnRateImproved,
    retentionSummary,
    ltv,
  };
}
