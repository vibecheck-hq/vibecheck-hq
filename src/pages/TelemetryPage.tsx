import { useEffect, useState, useCallback } from 'react';
import { Activity, Filter, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { TelemetryEvent, Severity } from '@/types';

const severityStyles: Record<Severity, { dot: string; text: string; bg: string }> = {
  info: { dot: 'bg-primary-500', text: 'text-primary-400', bg: 'bg-primary-500/10' },
  warning: { dot: 'bg-warning-500', text: 'text-warning-400', bg: 'bg-warning-500/10' },
  error: { dot: 'bg-error-400', text: 'text-error-400', bg: 'bg-error-500/10' },
  critical: { dot: 'bg-error-500', text: 'text-error-500', bg: 'bg-error-500/20' },
};

export function TelemetryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('telemetry_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setEvents(data as TelemetryEvent[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = events.filter((e) => {
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    if (search && !e.message.toLowerCase().includes(search.toLowerCase()) && !e.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Telemetry Events</h1>
        <p className="text-sm text-muted-400 mt-1">All text telemetry events from your pipeline</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-600" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-base-800 border border-base-700 text-sm text-slate-200 placeholder-muted-600 focus:outline-none focus:border-primary-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-500" />
          {(['all', 'info', 'warning', 'error', 'critical'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterSeverity === sev
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                  : 'text-muted-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity className="w-10 h-10 text-muted-600 mx-auto mb-3" />
          <p className="text-sm text-muted-400">
            {events.length === 0 ? 'No telemetry events recorded yet.' : 'No events match your filters.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-base-700/60">
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Severity</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Source</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Message</th>
                  <th className="text-left text-xs font-medium text-muted-500 uppercase tracking-wider px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => {
                  const style = severityStyles[event.severity];
                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="border-b border-base-700/30 hover:bg-base-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className={`badge ${style.bg} ${style.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-400">{event.source}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-400">{event.event_type}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 max-w-md truncate">{event.message}</td>
                      <td className="px-4 py-3 text-xs text-muted-500 font-mono whitespace-nowrap">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="w-full max-w-lg card p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Event Detail</h2>
                <p className="text-xs text-muted-500 font-mono mt-1">{selectedEvent.id}</p>
              </div>
              <span className={`badge ${severityStyles[selectedEvent.severity].bg} ${severityStyles[selectedEvent.severity].text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${severityStyles[selectedEvent.severity].dot}`} />
                {selectedEvent.severity}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-500 mb-1">Source</p>
                <p className="text-sm font-mono text-slate-300">{selectedEvent.source}</p>
              </div>
              <div>
                <p className="text-xs text-muted-500 mb-1">Event Type</p>
                <p className="text-sm font-mono text-slate-300">{selectedEvent.event_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-500 mb-1">Message</p>
                <p className="text-sm text-slate-300">{selectedEvent.message}</p>
              </div>
              <div>
                <p className="text-xs text-muted-500 mb-1">Timestamp</p>
                <p className="text-sm font-mono text-slate-300">{new Date(selectedEvent.created_at).toISOString()}</p>
              </div>
              {selectedEvent.payload && Object.keys(selectedEvent.payload).length > 0 && (
                <div>
                  <p className="text-xs text-muted-500 mb-1">Payload</p>
                  <pre className="text-xs font-mono text-slate-300 bg-base-800/60 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-5 w-full btn-ghost"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
