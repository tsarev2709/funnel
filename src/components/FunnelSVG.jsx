import PropTypes from 'prop-types';
import { useMemo } from 'react';

const StageHeight = 140;
const StageGap = 18;
const ViewWidth = 1080;

function createFormatter(locale) {
  try {
    return new Intl.NumberFormat(locale ?? 'ru-RU', { maximumFractionDigits: 1 });
  } catch (error) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  }
}

function widthForValue(value, topValue) {
  if (!topValue || topValue <= 0) return 220;
  const ratio = Math.max(0, Math.min(1, value / topValue));
  const minWidth = 220;
  const maxWidth = 860;
  return minWidth + (maxWidth - minWidth) * ratio;
}

function FunnelSVG({ stages, zones, presentationIndex, focusedStageId, onStageFocus, locale }) {
  const numberFormatter = useMemo(() => createFormatter(locale), [locale]);
  const topValue = stages?.[0]?.baseValue ?? 0;

  const zoneLayers = useMemo(() => {
    return zones.map((zone) => {
      const stageIndexes = stages
        .map((stage, index) => (stage.zoneId === zone.id ? index : null))
        .filter((value) => value !== null);
      if (!stageIndexes.length) return null;
      const start = Math.min(...stageIndexes);
      const end = Math.max(...stageIndexes);
      const y = start * (StageHeight + StageGap);
      const height = (end - start + 1) * (StageHeight + StageGap) - StageGap;
      return { ...zone, y, height };
    }).filter(Boolean);
  }, [zones, stages]);

  const basePolyline = [];
  const improvedPolyline = [];

  stages.forEach((stage, index) => {
    const currentWidth = widthForValue(stage.baseValue, topValue);
    const improvedWidth = widthForValue(stage.improvedValue, topValue);
    const y = index * (StageHeight + StageGap) + StageHeight / 2;
    const xBase = (ViewWidth - currentWidth) / 2;
    const xImproved = (ViewWidth + improvedWidth) / 2;
    basePolyline.push(`${xBase},${y}`);
    improvedPolyline.push(`${xImproved},${y}`);
  });

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
        <svg viewBox={`0 0 ${ViewWidth} ${stages.length * (StageHeight + StageGap)}`} className="w-full">
          <defs>
            <linearGradient id="stageGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.38" />
            </linearGradient>
          </defs>

          {zoneLayers.map((zone) => (
            <g key={zone.id}>
              <rect
                x={60}
                y={zone.y}
                width={ViewWidth - 120}
                height={zone.height}
                rx={26}
                fill={`${zone.color}0d`}
                stroke={`${zone.color}40`}
                strokeWidth={2}
              />
              <text
                x={80}
                y={zone.y + zone.height / 2}
                textAnchor="start"
                fill={zone.color}
                fontSize={14}
                fontWeight={600}
                className="uppercase tracking-wide"
              >
                {zone.name}
              </text>
            </g>
          ))}

          {stages.map((stage, index) => {
            const topStage = stages[index - 1];
            const topWidth = widthForValue(topStage?.baseValue ?? stage.baseValue, topValue);
            const bottomWidth = widthForValue(stage.baseValue, topValue);
            const improvedTopWidth = widthForValue(topStage?.improvedValue ?? stage.improvedValue, topValue);
            const improvedBottomWidth = widthForValue(stage.improvedValue, topValue);
            const yTop = index * (StageHeight + StageGap);
            const yBottom = yTop + StageHeight;
            const xTop = (ViewWidth - topWidth) / 2;
            const xBottom = (ViewWidth - bottomWidth) / 2;
            const xTopImproved = (ViewWidth - improvedTopWidth) / 2;
            const xBottomImproved = (ViewWidth - improvedBottomWidth) / 2;
            const isHighlighted = focusedStageId === stage.id || presentationIndex === index;
            return (
              <g key={stage.id}>
                <path
                  d={`M${xTop},${yTop} L${xTop + topWidth},${yTop} L${xBottom + bottomWidth},${yBottom} L${xBottom},${yBottom} Z`}
                  fill="url(#stageGradient)"
                  opacity={isHighlighted ? 0.9 : 0.55}
                  stroke={isHighlighted ? '#38bdf8' : '#1e293b'}
                  strokeWidth={isHighlighted ? 3.5 : 1.5}
                  onClick={() => onStageFocus?.(stage.id)}
                  className="cursor-pointer transition"
                />
                <path
                  d={`M${xTopImproved},${yTop} L${xTopImproved + improvedTopWidth},${yTop} L${xBottomImproved + improvedBottomWidth},${yBottom} L${xBottomImproved},${yBottom} Z`}
                  fill="rgba(16, 185, 129, 0.35)"
                  stroke="rgba(16, 185, 129, 0.75)"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
                <text
                  x={ViewWidth / 2}
                  y={yTop + StageHeight / 2 - 16}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize={20}
                  fontWeight={600}
                >
                  {stage.name}
                </text>
                <text
                  x={ViewWidth / 2}
                  y={yTop + StageHeight / 2 + 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={14}
                >
                  База: {numberFormatter.format(stage.baseValue)} → Улучш.: {numberFormatter.format(stage.improvedValue)}
                </text>
                <text
                  x={ViewWidth / 2}
                  y={yTop + StageHeight / 2 + 32}
                  textAnchor="middle"
                  fill={stage.benchmark && stage.baseConversion < stage.benchmark ? '#f97316' : '#22c55e'}
                  fontSize={13}
                >
                  {numberFormatter.format(stage.baseConversion)}% → {numberFormatter.format(stage.improvedConversion)}% ({numberFormatter.format(stage.improvedConversion - stage.baseConversion)} п.п.)
                </text>
              </g>
            );
          })}

          <polyline
            points={basePolyline.join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
          <polyline
            points={improvedPolyline.join(' ')}
            fill="none"
            stroke="#22c55e"
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-6 rounded-full bg-blue-400" /> Базовая траектория
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-6 rounded-full bg-emerald-400" /> Улучшенный сценарий
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-3 w-3 rounded-full border border-slate-500" /> Клик по этапу — фокус
        </div>
      </div>
    </div>
  );
}

FunnelSVG.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.object).isRequired,
  zones: PropTypes.arrayOf(PropTypes.object).isRequired,
  presentationIndex: PropTypes.number,
  focusedStageId: PropTypes.string,
  onStageFocus: PropTypes.func,
  locale: PropTypes.string,
};

export default FunnelSVG;
