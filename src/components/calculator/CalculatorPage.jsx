import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';
import { formatOptions, funnelModel, productTypes, serviceOptions, speedOptions } from '../../data/calculatorConfig.js';
import { ROBOTO_REGULAR_BASE64 } from './robotoRegularBase64.js';

function useRobotoFont(doc) {
  try {
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    return true;
  } catch (error) {
    console.error('Failed to register Roboto font for jsPDF', error);
    doc.setFont('helvetica', 'normal');
    return false;
  }
}

const productMap = new Map(productTypes.map((item) => [item.id, item]));
const formatMap = new Map(formatOptions.map((item) => [item.id, item]));

const currencyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

function formatCurrency(value) {
  return `${currencyFormatter.format(Math.round(value ?? 0))} ₽`;
}

function formatNumber(value) {
  return numberFormatter.format(Math.round(value ?? 0));
}

function formatPercent(value) {
  return `${percentFormatter.format(Math.max(0, value ?? 0))}%`;
}

function formatPercentDelta(value) {
  if (!Number.isFinite(value) || value === 0) {
    return '+0%';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${percentFormatter.format(value)}%`;
}

function formatDuration(seconds) {
  const clamped = Math.max(5, Math.min(300, Math.round(seconds)));
  const minutes = Math.floor(clamped / 60);
  const secs = clamped % 60;
  if (minutes <= 0) {
    return `${secs} сек`;
  }
  if (secs === 0) {
    return `${minutes} мин`;
  }
  return `${minutes} мин ${secs} сек`;
}

export function createInitialState() {
  const baseProduct = productTypes[0];
  const voiceoverService = serviceOptions.find((service) => service.id === 'voiceover');
  return {
    productTypeId: baseProduct?.id ?? 'single',
    durationSeconds: baseProduct?.defaultDurationSeconds ?? 60,
    speedId: speedOptions[0]?.id ?? 'normal',
    creativeCount: baseProduct?.supportsCreatives ? baseProduct.defaultCreativeCount ?? 1 : 1,
    selectedFormats: formatOptions.filter((item) => item.defaultSelected).map((item) => item.id),
    selectedServices: [],
    voiceoverType:
      voiceoverService?.defaultVoice ?? voiceoverService?.voiceOptions?.[0]?.id ?? 'female',
    revisionIterations: 2,
  };
}

function evaluateService(service, context) {
  const { durationMinutes, creativeMultiplier, voiceoverType } = context;
  let cost = service.price ?? 0;
  cost += (service.pricePerMinute ?? 0) * durationMinutes;

  let hours = (service.teamHours ?? 0) + (service.hoursPerMinute ?? 0) * durationMinutes;
  let load = service.teamLoad ?? 0;
  let timeline = service.timeline ?? 0;

  const multiplier = service.perCreative ? creativeMultiplier : 1;
  cost *= multiplier;
  hours *= multiplier;
  load *= multiplier;
  if (timeline) {
    timeline *= multiplier > 1 ? Math.max(1, multiplier * 0.6) : 1;
  }

  let voiceLabel;
  if (service.voiceOptions?.length) {
    const voice = service.voiceOptions.find((option) => option.id === voiceoverType) ?? service.voiceOptions[0];
    if (voice) {
      cost += voice.price ?? 0;
      voiceLabel = voice.label;
    }
  }

  return {
    cost,
    hours,
    load,
    timeline,
    voiceLabel,
    savings: service.clientSavings ?? {},
    roiBoost: service.roiBoost ?? 0,
  };
}

function evaluateFormat(format, context) {
  const { creativeMultiplier } = context;
  const multiplier = format.perCreative ? creativeMultiplier : 1;
  const cost = (format.price ?? 0) * multiplier;
  const hours = (format.teamHours ?? 0) * multiplier;
  const load = (format.teamLoad ?? 0) * multiplier;
  const timeline = (format.timeline ?? 0) * (format.perCreative ? Math.max(1, multiplier * 0.6) : 1);

  return { cost, hours, load, timeline };
}

function calculateFunnelProjection(model, adjustments = {}) {
  const stageBoosts = adjustments.stageConversions ?? new Map();
  const trafficBoost = adjustments.trafficBoost ?? 0;
  const avgCheckBoost = adjustments.avgCheckBoost ?? 0;
  const stages = model?.stages ?? [];
  const baseTraffic = model?.baseTraffic ?? stages[0]?.baseCount ?? 0;
  const stageStats = [];

  let baselinePrev = baseTraffic;
  let improvedPrev = baseTraffic * (1 + trafficBoost / 100);

  stages.forEach((stage, index) => {
    const baselineCount = index === 0 ? stage.baseCount ?? baseTraffic : (baselinePrev * (stage.conversion ?? 100)) / 100;
    const conversionBoost = stageBoosts.get(stage.id) ?? 0;
    const baselineConversion = index === 0 ? null : stage.conversion ?? 100;
    const improvedConversion = index === 0 ? null : Math.max(1, (stage.conversion ?? 100) + conversionBoost);
    const improvedCount = index === 0 ? improvedPrev : (improvedPrev * improvedConversion) / 100;

    stageStats.push({
      id: stage.id,
      label: stage.label,
      baselineCount: Math.round(baselineCount),
      improvedCount: Math.round(improvedCount),
      baselineConversion,
      improvedConversion: improvedConversion === null ? null : Number(improvedConversion.toFixed(1)),
      deltaCount: Math.round(improvedCount - baselineCount),
      deltaConversion: baselineConversion === null || improvedConversion === null ? null : Number((improvedConversion - baselineConversion).toFixed(1)),
    });

    baselinePrev = baselineCount;
    improvedPrev = improvedCount;
  });

  const lastStage = stageStats[stageStats.length - 1];
  const baseDeals = lastStage?.baselineCount ?? 0;
  const improvedDeals = lastStage?.improvedCount ?? 0;
  const baseRevenue = baseDeals * (model?.avgCheck ?? 0);
  const improvedRevenue = improvedDeals * (model?.avgCheck ?? 0) * (1 + avgCheckBoost / 100);

  return {
    stages: stageStats,
    baseDeals: Math.round(baseDeals),
    improvedDeals: Math.round(improvedDeals),
    dealDelta: Math.round(improvedDeals - baseDeals),
    baseRevenue: Math.round(baseRevenue),
    improvedRevenue: Math.round(improvedRevenue),
    revenueDelta: Math.round(improvedRevenue - baseRevenue),
    upliftPercent: baseDeals > 0 ? Number((((improvedDeals - baseDeals) / baseDeals) * 100).toFixed(1)) : 0,
  };
}

export function calculateSummary({
  productTypeId,
  speedId,
  durationSeconds,
  creativeCount,
  selectedFormats,
  selectedServices,
  voiceoverType,
  revisionIterations,
}) {
  const product = productMap.get(productTypeId) ?? productTypes[0];
  const speed = speedOptions.find((option) => option.id === speedId) ?? speedOptions[0];
  const creativeMultiplier = product.supportsCreatives ? Math.max(creativeCount, 1) : 1;
  const durationMinutes = Math.max(0, durationSeconds) / 60;
  let baseCost = (product.basePrice ?? 0) + durationMinutes * (product.pricePerMinute ?? 0);
  baseCost *= creativeMultiplier;

  let timelineDays = (product.baseTimeline ?? 0) + durationMinutes * (product.timelinePerMinute ?? 0);
  if (product.supportsCreatives) {
    timelineDays += Math.max(0, creativeMultiplier - 1) * 1.5;
  }

  let teamLoad = product.baseTeamLoad ?? 0;

  let servicesCost = 0;
  let formatsCost = 0;
  let roiBaseline = (product.expectedImpact ?? 0) * creativeMultiplier;
  let roiBoost = 0;

  const savings = {
    time: product.baseSavings?.time ?? 0,
    budget: product.baseSavings?.budget ?? 0,
    risk: product.baseSavings?.risk ?? 0,
    hours: product.baseSavings?.hours ?? 0,
    money: product.baseSavings?.money ?? 0,
  };

  let funnelTrafficBoost = product.funnelImpact?.trafficBoost ?? 0;
  let funnelAvgCheckBoost = product.funnelImpact?.avgCheckBoost ?? 0;
  const stageConversionBoosts = new Map();
  const applyStageBoosts = (impacts) => {
    if (!impacts) return;
    Object.entries(impacts).forEach(([stageId, boost]) => {
      if (!boost) return;
      stageConversionBoosts.set(stageId, (stageConversionBoosts.get(stageId) ?? 0) + boost);
    });
  };
  applyStageBoosts(product.funnelImpact?.stageConversions);

  const serviceEvaluations = new Map();
  const selectedServiceDetails = [];
  const serviceSet = new Set(selectedServices);
  const iterationService = serviceOptions.find((service) => service.id === 'iterations');

  serviceOptions.forEach((service) => {
    if (service.id === 'iterations') return;

    const evaluation = evaluateService(service, { durationMinutes, creativeMultiplier, voiceoverType });
    serviceEvaluations.set(service.id, evaluation);
    if (serviceSet.has(service.id)) {
      servicesCost += evaluation.cost;
      teamLoad += evaluation.load;
      timelineDays += evaluation.timeline;
      roiBoost += evaluation.roiBoost;
      savings.time += evaluation.savings.time ?? 0;
      savings.budget += evaluation.savings.budget ?? 0;
      savings.risk += evaluation.savings.risk ?? 0;
      savings.hours += evaluation.savings.hours ?? 0;
      savings.money += evaluation.savings.money ?? 0;
      if (service.funnelImpact) {
        funnelTrafficBoost += service.funnelImpact.trafficBoost ?? 0;
        funnelAvgCheckBoost += service.funnelImpact.avgCheckBoost ?? 0;
        applyStageBoosts(service.funnelImpact.stageConversions);
      }
      selectedServiceDetails.push({
        id: service.id,
        name: service.label,
        description: service.description,
        cost: Math.round(evaluation.cost),
        teamLoad: Math.round(evaluation.load),
        timeline: Math.round(evaluation.timeline),
        voice: evaluation.voiceLabel,
      });
    }
  });

  const animationEvaluation = serviceEvaluations.get('animation');
  const animationSelected = serviceSet.has('animation');
  const includedIterations = iterationService?.included ?? 0;
  const extraIterations = Math.max(0, revisionIterations - includedIterations);
  const iterationCost = (animationSelected ? (animationEvaluation?.cost ?? 0) : 0) *
    (iterationService?.percentPerExtra ?? 0) *
    extraIterations;
  if (iterationService) {
    const evaluation = {
      cost: iterationCost,
      hours: 0,
      load: 0,
      timeline: 0,
      iterations: revisionIterations,
      extraIterations,
      savings: {},
      roiBoost: 0,
    };
    serviceEvaluations.set(iterationService.id, evaluation);
    servicesCost += evaluation.cost;
    selectedServiceDetails.push({
      id: iterationService.id,
      name: iterationService.label,
      description: iterationService.description,
      cost: Math.round(evaluation.cost),
      iterations: revisionIterations,
      included: includedIterations,
    });
  }

  const formatEvaluations = new Map();
  const selectedFormatDetails = [];
  const formatSet = new Set(selectedFormats);
  formatOptions.forEach((format) => {
    const evaluation = evaluateFormat(format, { creativeMultiplier });
    formatEvaluations.set(format.id, evaluation);
    if (formatSet.has(format.id)) {
      formatsCost += evaluation.cost;
      teamLoad += evaluation.load;
      timelineDays += evaluation.timeline;
      selectedFormatDetails.push({
        id: format.id,
        name: format.label,
        cost: Math.round(evaluation.cost),
      });
    }
  });

  const formatSurcharge = selectedFormats.length >= 2 ? selectedFormats.length * 2000 : 0;
  formatsCost += formatSurcharge;

  const priceMultiplier = speed?.priceMultiplier ?? 1;
  const timeMultiplier = speed?.timeMultiplier ?? 1;

  const baseCostWithSpeed = Math.round(baseCost * priceMultiplier);
  const servicesCostWithSpeed = Math.round(servicesCost * priceMultiplier);
  const formatsCostWithSpeed = Math.round(formatsCost * priceMultiplier);

  const subtotal = baseCost + servicesCost + formatsCost;
  const totalCost = baseCostWithSpeed + servicesCostWithSpeed + formatsCostWithSpeed;
  const timelineResult = Math.max(5, Math.round(timelineDays * timeMultiplier));
  const teamLoadPercent = Math.min(100, Math.round(teamLoad));

  const roiReference = roiBaseline + roiBoost * 14000 * creativeMultiplier + (savings.money ?? 0) * 0.25;
  const roi = totalCost > 0 ? Math.round(((roiReference - totalCost) / totalCost) * 100) : 0;

  const savingsTime = Math.min(90, Math.round(savings.time ?? 0));
  const savingsBudget = Math.min(90, Math.round(savings.budget ?? 0));
  const savingsRisk = Math.min(90, Math.round(savings.risk ?? 0));
  const savedHours = Math.max(0, Math.round(savings.hours ?? 0));
  const savedMoney = Math.max(0, Math.round(savings.money ?? 0));

  const savingsSummary = `≈ ${savingsTime}% времени / ${savingsBudget}% бюджета / ${savingsRisk}% рисков`;

  const funnelProjection = calculateFunnelProjection(funnelModel, {
    stageConversions: stageConversionBoosts,
    trafficBoost: funnelTrafficBoost,
    avgCheckBoost: funnelAvgCheckBoost,
  });

  const exportPayload = {
    productType: product.id,
    productName: product.label,
    description: product.description,
    parameters: {
      durationSeconds,
      durationFormatted: formatDuration(durationSeconds),
      speed: speed.label,
      creatives: product.supportsCreatives ? creativeMultiplier : undefined,
      formats: selectedFormatDetails.map((item) => item.name),
    },
    services: selectedServiceDetails.map((service) => ({
      name: service.name,
      description: service.description,
      cost: service.cost,
      voice: service.voice ?? undefined,
      teamLoad: service.teamLoad,
      timelineDays: service.timeline,
      iterations: service.iterations,
      includedIterations: service.included,
    })),
    totals: {
      cost: totalCost,
      timelineDays: timelineResult,
      teamLoadPercent,
      roiPercent: roi,
      savings: {
        summary: savingsSummary,
        savedHours,
        savedMoney,
      },
      breakdown: {
        base: baseCostWithSpeed,
        services: servicesCostWithSpeed,
        formats: formatsCostWithSpeed,
      },
    },
    note: `Сэкономите ≈ ${savedHours} часов и ${formatCurrency(savedMoney)} в месяц.`,
  };

  return {
    product,
    speed,
    creativeMultiplier,
    durationMinutes,
    subtotal,
    servicesCost,
    formatsCost,
    costBreakdown: {
      base: baseCostWithSpeed,
      services: servicesCostWithSpeed,
      formats: formatsCostWithSpeed,
      priceMultiplier,
    },
    totals: {
      totalCost,
      timelineDays: timelineResult,
      teamLoadPercent,
      roi,
      savingsSummary,
      savedHours,
      savedMoney,
    },
    selectedServiceDetails,
    selectedFormatDetails,
    serviceEvaluations,
    formatEvaluations,
    exportPayload,
    funnelProjection,
  };
}

function CalculatorPage() {
  const initialState = useMemo(() => createInitialState(), []);
  const [productTypeId, setProductTypeId] = useState(initialState.productTypeId);
  const [durationSeconds, setDurationSeconds] = useState(initialState.durationSeconds);
  const [speedId, setSpeedId] = useState(initialState.speedId);
  const [creativeCount, setCreativeCount] = useState(initialState.creativeCount);
  const [selectedFormats, setSelectedFormats] = useState(initialState.selectedFormats);
  const [selectedServices, setSelectedServices] = useState(initialState.selectedServices);
  const [voiceoverType, setVoiceoverType] = useState(initialState.voiceoverType);
  const [revisionIterations, setRevisionIterations] = useState(initialState.revisionIterations);
  const [showFunnelImpact, setShowFunnelImpact] = useState(false);

  useEffect(() => {
    const product = productMap.get(productTypeId);
    if (!product) return;
    if (!product.supportsCreatives) {
      setCreativeCount(1);
    } else {
      setCreativeCount((prev) => Math.max(product.defaultCreativeCount ?? 1, prev));
    }
    const desiredDuration = product.defaultDurationSeconds ?? 60;
    setDurationSeconds((prev) => (prev === desiredDuration ? prev : desiredDuration));
  }, [productTypeId]);

  const summary = useMemo(
    () =>
      calculateSummary({
        productTypeId,
        speedId,
        durationSeconds,
        creativeCount,
        selectedFormats,
        selectedServices,
        voiceoverType,
        revisionIterations,
      }),
    [
      productTypeId,
      speedId,
      durationSeconds,
    creativeCount,
    selectedFormats,
    selectedServices,
    voiceoverType,
    revisionIterations,
  ]);

  const handleToggleFormat = (formatId) => {
    setSelectedFormats((prev) => {
      if (prev.includes(formatId)) {
        return prev.filter((id) => id !== formatId);
      }
      return [...prev, formatId];
    });
  };

  const handleToggleService = (serviceId) => {
    if (serviceId === 'iterations') return;
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const handleReset = () => {
    const defaults = createInitialState();
    setProductTypeId(defaults.productTypeId);
    setDurationSeconds(defaults.durationSeconds);
    setSpeedId(defaults.speedId);
    setCreativeCount(defaults.creativeCount);
    setSelectedFormats(defaults.selectedFormats);
    setSelectedServices(defaults.selectedServices);
    setVoiceoverType(defaults.voiceoverType);
    setRevisionIterations(defaults.revisionIterations);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(summary.exportPayload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'anix-calculator.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
    const fontLoaded = useRobotoFont(doc);

    let y = 20;

    doc.setFontSize(16);
    doc.text('Коммерческое предложение — Anix', 14, y);
    y += 10;

    if (!fontLoaded) {
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(12);
    doc.text(`Продукт: ${summary.product.label}`, 14, y);
    y += 6;
    doc.text(`Длительность: ${formatDuration(durationSeconds)}`, 14, y);
    y += 6;
    if (summary.product.supportsCreatives) {
      doc.text(`Креативы: ${summary.creativeMultiplier} шт.`, 14, y);
      y += 6;
    }
    doc.text(`Скорость производства: ${summary.speed.label}`, 14, y);
    y += 6;
    doc.text(`Итоговая стоимость: ${formatCurrency(summary.totals.totalCost)}`, 14, y);
    y += 6;
    doc.text(`Срок производства: ${summary.totals.timelineDays} дней`, 14, y);
    y += 6;
    doc.text(`Загрузка команды: ${summary.totals.teamLoadPercent}%`, 14, y);
    y += 8;

    doc.text('Выбранные услуги:', 14, y);
    y += 6;
    if (summary.selectedServiceDetails.length === 0) {
      doc.text('— Без дополнительных опций', 18, y);
      y += 6;
    } else {
      summary.selectedServiceDetails.forEach((service) => {
        const line = `• ${service.name} — ${formatCurrency(service.cost)}${service.voice ? ` (${service.voice})` : ''}`;
        doc.text(line, 18, y);
        y += 6;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    y += 4;
    doc.text(`Экономия: ${summary.totals.savingsSummary}`, 14, y);
    y += 6;
    doc.text(`ROI (прогноз): ${summary.totals.roi}%`, 14, y);
    y += 6;
    doc.text(summary.exportPayload.note, 14, y);
    y += 10;
    doc.text('Спасибо, что выбрали Anix!', 14, y);

    doc.save('anix-commercial-offer.pdf');
  };

  const product = summary.product;
  const durationLabel = formatDuration(durationSeconds);
  const funnelStats = summary.funnelProjection;

  return (
    <div className="space-y-8 pt-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-cyan-950/25">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">Калькулятор услуг Anix</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Соберите конфигурацию видео-продукта, мгновенно оцените бюджет, загрузку команды и выгоды для клиента.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {productTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setProductTypeId(type.id)}
                  className={clsx(
                    'rounded-full border px-4 py-2 text-sm font-medium transition',
                    productTypeId === type.id
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                      : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-100',
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-400">{product.description}</p>
          </div>
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-5 text-slate-50 shadow-lg shadow-cyan-900/40">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Итоговая стоимость</p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.totals.totalCost)}</p>
            <p className="mt-3 text-sm text-cyan-100">
              Срок производства: <span className="font-semibold">{summary.totals.timelineDays} дн.</span>
            </p>
            <p className="mt-1 text-sm text-cyan-100">
              Загрузка команды: <span className="font-semibold">{summary.totals.teamLoadPercent}%</span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleReset}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Сбросить
          </button>
          <button
            onClick={handleDownloadPdf}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Скачать КП (PDF)
          </button>
          <button
            onClick={handleExportJson}
            className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
          >
            Экспорт JSON
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-950/30">
            <h2 className="text-lg font-semibold text-slate-100">Общие параметры</h2>
            <div className="mt-4 space-y-6">
              <div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Длительность ролика</span>
                  <span className="font-medium text-cyan-100">{durationLabel}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={300}
                  step={5}
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(Number(event.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
                />
              </div>

              <div>
                <span className="text-sm text-slate-300">Сроки</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {speedOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSpeedId(option.id)}
                      className={clsx(
                        'rounded-full border px-4 py-2 text-sm transition',
                        speedId === option.id
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                          : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-100',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {product.supportsCreatives && (
                <div>
                  <label className="flex items-center justify-between text-sm text-slate-300">
                    <span>Количество креативов</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={creativeCount}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isNaN(value)) {
                          setCreativeCount(1);
                          return;
                        }
                        setCreativeCount(Math.max(1, Math.min(12, value)));
                      }}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-900/40 px-2 py-1 text-right text-sm text-slate-100"
                    />
                  </label>
                </div>
              )}

              <div>
                <span className="text-sm text-slate-300">Разрешения и форматы</span>
                <p className="mt-1 text-xs text-slate-400">
                  Форматы бесплатны; при выборе двух и более добавляется по 2 000 ₽ за каждый вариант.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {formatOptions.map((format) => {
                    const checked = selectedFormats.includes(format.id);
                    const evaluation = summary.formatEvaluations.get(format.id);
                    return (
                      <label
                        key={format.id}
                        className={clsx(
                          'flex cursor-pointer flex-col rounded-2xl border p-3 transition',
                          checked
                            ? 'border-indigo-400 bg-indigo-500/10 text-slate-100'
                            : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-indigo-400/40',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleFormat(format.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-400 focus:ring-indigo-400"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-100">{format.label}</p>
                            <p className="text-xs text-slate-400">{format.description}</p>
                            <p className="mt-2 text-xs text-indigo-200">≈ {formatCurrency(evaluation?.cost ?? format.price ?? 0)}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-950/30">
            <h2 className="text-lg font-semibold text-slate-100">Этапы и услуги</h2>
            <div className="mt-4 space-y-4">
              {serviceOptions.map((service) => {
                const isIterations = service.id === 'iterations';
                const checked = isIterations ? true : selectedServices.includes(service.id);
                const evaluation = summary.serviceEvaluations.get(service.id);
                const includedIterations = service.included ?? 0;
                const extraIterations = isIterations ? Math.max(0, revisionIterations - includedIterations) : 0;
                return (
                  <div
                    key={service.id}
                    className={clsx(
                      'rounded-2xl border p-4 transition',
                      checked || isIterations
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-900/40 hover:border-cyan-500/40',
                    )}
                  >
                    {isIterations ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-100">{service.label}</span>
                          <span className="text-xs text-cyan-200">
                            Доп. итерации: {extraIterations} · {formatCurrency(evaluation?.cost ?? 0)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{service.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                          <label className="flex items-center gap-2">
                            <span>Всего итераций:</span>
                            <input
                              type="number"
                              min={includedIterations}
                              value={revisionIterations}
                              onChange={(event) =>
                                setRevisionIterations(
                                  Math.max(includedIterations, Number(event.target.value) || includedIterations),
                                )
                              }
                              className="w-20 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-100"
                            />
                          </label>
                          <span className="text-xs text-slate-400">Включено {includedIterations} без доплаты</span>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleService(service.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                        />
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-100">{service.label}</span>
                            <span className="text-xs text-cyan-200">
                              ≈ {formatCurrency(evaluation?.cost ?? service.price ?? 0)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300">{service.description}</p>
                          <p className="text-xs text-slate-400">
                            Загрузка +{service.teamLoad}% · {service.timeline} дн. · Экономия до {service.clientSavings?.time ?? 0}% времени
                          </p>
                          {service.voiceOptions?.length && checked && (
                            <select
                              value={voiceoverType}
                              onChange={(event) => setVoiceoverType(event.target.value)}
                              className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                            >
                              {service.voiceOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label} — {formatCurrency(option.price)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-indigo-950/40">
            <h3 className="text-lg font-semibold text-slate-100">Итоги проекта</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-300">💰 Итоговая стоимость</dt>
                <dd className="text-xl font-semibold text-slate-50">{formatCurrency(summary.totals.totalCost)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-300">⏱️ Срок производства</dt>
                <dd className="text-base font-medium text-slate-100">{summary.totals.timelineDays} дней</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-300">👥 Загрузка команды</dt>
                <dd className="text-base font-medium text-slate-100">{summary.totals.teamLoadPercent}%</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-300">🧠 Экономия клиента</dt>
                <dd className="text-base font-medium text-emerald-200">{summary.totals.savingsSummary}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-300">📊 Окупаемость (ROI)</dt>
                <dd className="text-base font-medium text-indigo-200">{summary.totals.roi}%</dd>
              </div>
            </dl>
            <div className="mt-5 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Состав стоимости</p>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-300">Базовый пакет</dt>
                  <dd className="font-medium text-slate-50">{formatCurrency(summary.costBreakdown.base)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-300">Выбранные услуги</dt>
                  <dd className="font-medium text-slate-50">{formatCurrency(summary.costBreakdown.services)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-300">Форматы и адаптации</dt>
                  <dd className="font-medium text-slate-50">{formatCurrency(summary.costBreakdown.formats)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2 text-slate-200">
                  <dt>Итого</dt>
                  <dd className="text-base font-semibold text-slate-50">{formatCurrency(summary.totals.totalCost)}</dd>
                </div>
              </dl>
              {summary.costBreakdown.priceMultiplier !== 1 && (
                <p className="text-xs text-slate-500">Учтён множитель скорости ×{summary.costBreakdown.priceMultiplier}.</p>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-400">{summary.exportPayload.note}</p>
            <button
              onClick={handleDownloadPdf}
              className="mt-6 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              Сформировать коммерческое предложение
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-indigo-950/20">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Структура проекта</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Длительность: {durationLabel}</li>
              <li>Формат: {summary.selectedFormatDetails.length > 0 ? summary.selectedFormatDetails.map((item) => item.name).join(', ') : 'только мастер-версия'}</li>
              {product.supportsCreatives && (
                <li>Креативов: {summary.creativeMultiplier} шт.</li>
              )}
              <li>Скорость: {summary.speed.label}</li>
            </ul>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-100">Выбранные услуги</h4>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                {summary.selectedServiceDetails.length === 0 ? (
                  <li>Базовый пакет без дополнительных опций.</li>
                ) : (
                  summary.selectedServiceDetails.map((service) => (
                    <li key={service.id}>
                      {service.name} — {formatCurrency(service.cost)}
                      {service.voice ? ` (${service.voice})` : ''}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-xl shadow-indigo-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Как это влияет на воронку</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Учитываем выбранный продукт, пакеты услуг и получаем прогноз по количеству лидов, встреч, КП и закрытых сделок.
              Показываем, какую выручку добавит новая коммуникация.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="rounded-full border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
            >
              Редактировать воронку
            </Link>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={showFunnelImpact}
                onChange={(event) => setShowFunnelImpact(event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
              />
              <span>Показать расчёт по воронке</span>
            </label>
          </div>
        </div>

        {showFunnelImpact && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Сделки в месяц</p>
                <p className="mt-2 text-3xl font-semibold text-slate-50">{formatNumber(funnelStats.improvedDeals)}</p>
                <p className="text-sm text-emerald-300">
                  {funnelStats.dealDelta >= 0 ? '+' : ''}
                  {formatNumber(funnelStats.dealDelta)} контактов · {formatPercentDelta(funnelStats.upliftPercent)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Доп. выручка</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-200">{formatCurrency(funnelStats.revenueDelta)}</p>
                <p className="text-sm text-slate-400">Всего после внедрения: {formatCurrency(funnelStats.improvedRevenue)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Базовая выручка</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">{formatCurrency(funnelStats.baseRevenue)}</p>
                <p className="text-sm text-slate-400">Для сопоставления с текущими цифрами</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {funnelStats.stages.map((stage) => (
                <div key={stage.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stage.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">{formatNumber(stage.improvedCount)}</p>
                  <p className="text-xs text-slate-400">
                    Было {formatNumber(stage.baselineCount)}
                    {stage.baselineConversion != null ? ` · ${formatPercent(stage.baselineConversion)}` : ''}
                  </p>
                  {stage.improvedConversion != null && (
                    <p className="text-xs text-emerald-300">
                      Стало {formatPercent(stage.improvedConversion)} ({formatPercentDelta(stage.deltaConversion ?? 0)})
                    </p>
                  )}
                  <p
                    className={clsx(
                      'mt-2 text-sm font-medium',
                      stage.deltaCount >= 0 ? 'text-emerald-300' : 'text-rose-300',
                    )}
                  >
                    {stage.deltaCount >= 0 ? '+' : ''}
                    {formatNumber(stage.deltaCount)} контактов
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default CalculatorPage;
