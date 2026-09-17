import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Cpu,
  Loader2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { supabase, E_ABS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { TelemetryEvent, StylometryVector, SystemMetric } from '@/types';
import type { Page } from '@/components/Sidebar';
import { BarChart, EnergyAnchor, RadialGauge, Sparkline, VectorRadar } from '@/components/charts';

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
}

const mockTrend = [
  { label: '00h', value: 4200 },
  { label: '04h', value: 5800 },
  { label: '08h', value: 4100 },
  { label: '12h', value: 8200 },
  { label: '16h', value: 6400 },
  { label: '20h', value: 9100 },
  { label: 'now', value: 12847 },
];

const severityBars = [
  { label: 'Mon', value: 340 },
  { label: 'Tue', value: 280 },
  { label: 'Wed', value: 520 },
  { label: 'Thu', value: 410 },
  { label: 'Fri', value: 670 },
  { label: 'Sat', value: 380 },
  { label: 'Sun', value: 290 },
];

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [vectors, setVectors] = useState<StylometryVector[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [eventsRes, vectorsRes, metricsRes] = await Promise.all([
      supabase.from('telemetry_events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('stylometry_vectors').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('system_metrics').select('*').order('recorded_at', { ascending: false }).limit(20),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data as TelemetryEvent[]);
    if (vectorsRes.data) setVectors(vectorsRes.data as StylometryVector[]);
    if (metricsRes.data) setMetrics(metricsRes.data as SystemMetric[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  const totalEvents = events.length;
  const errorCount = events.filter((e) => e.severity === 'error' || e.severity === 'critical').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;
  const avgLatency = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.latency_ms, 0) / metrics.length
    : 0;
  const avgThroughput = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length
    : 0;

  const latestVector = vectors[0];
  const radarMetrics = latestVector
    ? [
        { label: 'Lexical', value: latestVector.lexical_diversity * 100 },
        { label: 'Syntactic', value: latestVector.syntactic_complexity * 100 },
        { label: 'Entropy', value: latestVector.structural_entropy * 100 },
        { label: 'Readability', value: latestVector.readability_score },
        { label: 'Sentiment', value: (latestVector.sentiment_polarity + 1) * 50 },
      ]
    : [
        { label: 'Lexical', value: 0 },
        { label: 'Syntactic', value: 0 },
        { label: 'Entropy', value: 0 },
        { label: 'Readability', value: 0 },
        { label: 'Sentiment', value: 50 },
      ];

  const statCards = [
    {
      label: 'Total Events',
      value: totalEvents.toLocaleString(),
      icon: Activity,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10 border-primary-500/20',
      trend: '+12.4%',
      trendUp: true,
    },
    {
      label: 'Warnings',
      value: warningCount.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-warning-400',
      bg: 'bg-warning-500/10 border-warning-500/20',
      trend: warningCount > 0 ? `${warningCount} active` : 'None',
      trendUp: false,
    },
    {
      label: 'Errors',
      value: errorCount.toLocaleString(),
      icon: XCircle,
      color: 'text-error-400',
      bg: 'bg-error-500/10 border-error-500/20',
      trend: errorCount > 0 ? `${errorCount} active` : 'None',
      trendUp: false,
    },
    {
      label: 'Avg Throughput',
      value: `${Math.round(avgThroughput).toLocaleString()}/s`,
      icon: TrendingUp,
      color: 'text-success-400',
      bg: 'bg-success-500/10 border-success-500/20',
      trend: '+8.2%',
      trendUp: true,
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-muted-400 mt-1">Real-time telemetry overview</p>
        </div>
        <EnergyAnchor />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card card-hover p-5 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className={`text-xs ${card.trendUp ? 'text-success-400' : 'text-muted-500'}`}>
                  {card.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100 font-mono">{card.value}</p>
              <p className="text-xs text-muted-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Throughput trend */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Event Throughput</h2>
              <p className="text-xs text-muted-500">Events per hour, last 24h</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-500" />
          </div>
          <BarChart data={mockTrend} color="#22d3ee" />
          <div className="flex justify-between mt-2">
            {mockTrend.map((d) => (
              <span key={d.label} className="text-[10px] text-muted-600 font-mono">{d.label}</span>
            ))}
          </div>
        </div>

        {/* Latency gauge */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Avg Latency</h2>
              <p className="text-xs text-muted-500">Across all nodes</p>
            </div>
            <Cpu className="w-4 h-4 text-muted-500" />
          </div>
          <div className="flex justify-center">
            <RadialGauge value={avgLatency} max={200} label="Latency" unit="ms" color="#fbbf24" />
          </div>
        </div>
      </div>

      {/* Vector radar + sparklines */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Stylometry Vector</h2>
              <p className="text-xs text-muted-500">
                {latestVector ? latestVector.sample_label : 'No samples yet'}
              </p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-500" />
          </div>
          <div className="flex justify-center">
            <VectorRadar metrics={radarMetrics} />
          </div>
          <button
            onClick={() => onNavigate('stylometry')}
            className="mt-4 w-full flex items-center justify-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            View all vectors <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Severity Distribution</h2>
              <p className="text-xs text-muted-500">Events by day this week</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-muted-500" />
          </div>
          <BarChart data={severityBars} color="#f59e0b" />
          <div className="flex justify-between mt-2">
            {severityBars.map((d) => (
              <span key={d.label} className="text-[10px] text-muted-600 font-mono">{d.label}</span>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <Sparkline data={mockTrend.slice(0, 7)} color="#22d3ee" />
              <span className="text-xs text-muted-400 mt-1">Info</span>
            </div>
            <div className="flex flex-col items-center">
              <Sparkline data={severityBars} color="#eab308" />
              <span className="text-xs text-muted-400 mt-1">Warnings</span>
            </div>
            <div className="flex flex-col items-center">
              <Sparkline data={mockTrend.slice(0, 7).map((d) => ({ ...d, value: d.value * 0.05 }))} color="#ef4444" />
              <span className="text-xs text-muted-400 mt-1">Errors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent events preview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Recent Events</h2>
          <button
            onClick={() => onNavigate('telemetry')}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-muted-600 mx-auto mb-2" />
            <p className="text-sm text-muted-400">No telemetry events yet</p>
            <p className="text-xs text-muted-600 mt-1">Events will appear here as they are ingested.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-base-800/40 hover:bg-base-800/80 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.severity === 'critical' ? 'bg-error-500' :
                    event.severity === 'error' ? 'bg-error-400' :
                    event.severity === 'warning' ? 'bg-warning-500' :
                    'bg-primary-500'
                  }`}
                />
                <span className="text-xs font-mono text-muted-500 flex-shrink-0">{event.source}</span>
                <span className="text-sm text-slate-300 truncate flex-1">{event.message}</span>
                <span className="text-xs text-muted-600 font-mono flex-shrink-0">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
