import { E_ABS } from '@/lib/supabase';

interface DataPoint {
  label: string;
  value: number;
}

interface SparklineProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = '#22d3ee', height = 40 }: SparklineProps) {
  if (data.length === 0) return null;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 120;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - ((d.value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BarChartProps {
  data: DataPoint[];
  color?: string;
  max?: number;
}

export function BarChart({ data, color = '#22d3ee', max }: BarChartProps) {
  const maxVal = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => {
        const h = (d.value / maxVal) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-500 hover:opacity-80"
            style={{
              height: `${Math.max(h, 2)}%`,
              background: `linear-gradient(to top, ${color}40, ${color})`,
            }}
            title={`${d.label}: ${d.value}`}
          />
        );
      })}
    </div>
  );
}

interface RadialGaugeProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color?: string;
}

export function RadialGauge({
  value,
  max = 100,
  label,
  unit = '',
  color = '#22d3ee',
}: RadialGaugeProps) {
  const pct = Math.min(value / max, 1);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - pct);
  const angle = pct * 270 - 135;

  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r="36"
          fill="none"
          stroke="#232838"
          strokeWidth="6"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          transform="rotate(135 48 48)"
        />
        <circle
          cx="48"
          cy="48"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset + circumference * 0.25}
          transform="rotate(135 48 48)"
          className="transition-all duration-700"
        />
        <text
          x="48"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-200 font-mono"
          fontSize="16"
          fontWeight="600"
        >
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="text-xs text-muted-400 mt-1">{label}</span>
      {unit && <span className="text-xs text-muted-500">{unit}</span>}
    </div>
  );
}

interface VectorRadarProps {
  metrics: { label: string; value: number }[];
}

export function VectorRadar({ metrics }: VectorRadarProps) {
  const size = 160;
  const center = size / 2;
  const radius = 60;
  const sides = metrics.length;
  const angleStep = (Math.PI * 2) / sides;

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const pointAt = (angle: number, r: number) => ({
    x: center + Math.cos(angle - Math.PI / 2) * r,
    y: center + Math.sin(angle - Math.PI / 2) * r,
  });

  const dataPoints = metrics.map((m, i) => {
    const angle = i * angleStep;
    const r = (m.value / 100) * radius;
    return pointAt(angle, r);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridLevels.map((level) => {
        const points = metrics.map((_, i) => {
          const angle = i * angleStep;
          const p = pointAt(angle, radius * level);
          return `${p.x},${p.y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="#232838"
            strokeWidth="0.5"
          />
        );
      })}
      {/* Axes */}
      {metrics.map((_, i) => {
        const angle = i * angleStep;
        const p = pointAt(angle, radius);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="#232838"
            strokeWidth="0.5"
          />
        );
      })}
      {/* Data shape */}
      <path
        d={dataPath}
        fill="rgba(34, 211, 238, 0.15)"
        stroke="#22d3ee"
        strokeWidth="1.5"
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#22d3ee" />
      ))}
      {/* Labels */}
      {metrics.map((m, i) => {
        const angle = i * angleStep;
        const p = pointAt(angle, radius + 14);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-400"
            fontSize="8"
          >
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}

interface EnergyAnchorProps {
  value?: number;
}

export function EnergyAnchor({ value = E_ABS }: EnergyAnchorProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-800/60 border border-primary-500/20">
      <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-glow" />
      <span className="text-xs text-muted-400">Thermodynamic Anchor</span>
      <span className="constant-ref text-sm">E_ABS = {value.toFixed(4)}</span>
    </div>
  );
}
