import { useEffect, useState, useCallback } from 'react';
import { Cpu, Loader2, Terminal } from 'lucide-react';
import { supabase, E_ABS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { SystemMetric, NodeStatus } from '@/types';
import { EnergyAnchor, RadialGauge } from '@/components/charts';

const statusStyles: Record<NodeStatus, { dot: string; text: string; bg: string }> = {
  healthy: { dot: 'bg-success-500', text: 'text-success-400', bg: 'bg-success-500/10' },
  degraded: { dot: 'bg-warning-500', text: 'text-warning-400', bg: 'bg-warning-500/10' },
  critical: { dot: 'bg-error-500', text: 'text-error-400', bg: 'bg-error-500/10' },
};

export function SystemPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);

  const loadMetrics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('system_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50);
    if (data) setMetrics(data as SystemMetric[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  // Group by node_id (latest per node)
  const nodeMap = new Map<string, SystemMetric>();
  for (const m of metrics) {
    if (!nodeMap.has(m.node_id)) nodeMap.set(m.node_id, m);
  }
  const nodes = Array.from(nodeMap.values());

  const avgThroughput = nodes.length > 0 ? nodes.reduce((s, n) => s + n.throughput, 0) / nodes.length : 0;
  const avgLatency = nodes.length > 0 ? nodes.reduce((s, n) => s + n.latency_ms, 0) / nodes.length : 0;
  const avgEntropy = nodes.length > 0 ? nodes.reduce((s, n) => s + n.entropy_bits, 0) / nodes.length : 0;
  const healthyCount = nodes.filter((n) => n.status === 'healthy').length;
  const degradedCount = nodes.filter((n) => n.status === 'degraded').length;
  const criticalCount = nodes.filter((n) => n.status === 'critical').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">System Metrics</h1>
          <p className="text-sm text-muted-400 mt-1">Architecture node health and performance</p>
        </div>
        <EnergyAnchor />
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 flex flex-col items-center">
          <RadialGauge value={avgThroughput} max={15000} label="Throughput" unit="events/s" color="#22d3ee" />
        </div>
        <div className="card p-6 flex flex-col items-center">
          <RadialGauge value={avgLatency} max={200} label="Latency" unit="ms" color="#fbbf24" />
        </div>
        <div className="card p-6 flex flex-col items-center">
          <RadialGauge value={avgEntropy} max={8} label="Entropy" unit="bits" color="#4ade80" />
        </div>
        <div className="card p-6 flex flex-col items-center">
          <RadialGauge value={E_ABS} max={10} label="E_ABS" unit="anchor" color="#f87171" />
        </div>
      </div>

      {/* Node health summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <div>
            <p className="text-xl font-bold text-slate-100 font-mono">{healthyCount}</p>
            <p className="text-xs text-muted-400">Healthy</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-warning-500" />
          <div>
            <p className="text-xl font-bold text-slate-100 font-mono">{degradedCount}</p>
            <p className="text-xs text-muted-400">Degraded</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-error-500" />
          <div>
            <p className="text-xl font-bold text-slate-100 font-mono">{criticalCount}</p>
            <p className="text-xs text-muted-400">Critical</p>
          </div>
        </div>
      </div>

      {/* Node table */}
      {nodes.length === 0 ? (
        <div className="card p-12 text-center">
          <Terminal className="w-10 h-10 text-muted-600 mx-auto mb-3" />
          <p className="text-sm text-muted-400">No system metrics recorded yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-base-700/60">
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Node</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Throughput</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Latency</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Entropy</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Energy</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => {
                  const style = statusStyles[node.status];
                  return (
                    <tr key={node.id} className="border-b border-base-700/30 hover:bg-base-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-muted-500" />
                          <span className="text-sm font-mono text-slate-300">{node.node_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${style.bg} ${style.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {node.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-primary-400">{node.throughput.toFixed(0)}/s</td>
                      <td className="px-4 py-3 text-sm font-mono text-accent-400">{node.latency_ms.toFixed(1)}ms</td>
                      <td className="px-4 py-3 text-sm font-mono text-success-400">{node.entropy_bits.toFixed(2)} bits</td>
                      <td className="px-4 py-3 text-sm font-mono text-error-400">{node.energy_abs.toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs text-muted-500 font-mono">
                        {new Date(node.recorded_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
