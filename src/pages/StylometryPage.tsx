import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { StylometryVector } from '@/types';
import { VectorRadar } from '@/components/charts';

export function StylometryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vectors, setVectors] = useState<StylometryVector[]>([]);
  const [selected, setSelected] = useState<StylometryVector | null>(null);

  const loadVectors = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('stylometry_vectors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) {
      const vecs = data as StylometryVector[];
      setVectors(vecs);
      if (vecs.length > 0 && !selected) setSelected(vecs[0]);
    }
    setLoading(false);
  }, [user, selected]);

  useEffect(() => {
    loadVectors();
  }, [loadVectors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  const radarMetrics = selected
    ? [
        { label: 'Lexical', value: selected.lexical_diversity * 100 },
        { label: 'Syntactic', value: selected.syntactic_complexity * 100 },
        { label: 'Entropy', value: selected.structural_entropy * 100 },
        { label: 'Readability', value: selected.readability_score },
        { label: 'Sentiment', value: (selected.sentiment_polarity + 1) * 50 },
      ]
    : [];

  const metricBars = selected
    ? [
        { label: 'Lexical Diversity', value: selected.lexical_diversity, max: 1, color: '#22d3ee' },
        { label: 'Syntactic Complexity', value: selected.syntactic_complexity, max: 1, color: '#06b6d4' },
        { label: 'Structural Entropy', value: selected.structural_entropy, max: 1, color: '#fbbf24' },
        { label: 'Readability Score', value: selected.readability_score, max: 100, color: '#4ade80' },
        { label: 'Sentiment Polarity', value: selected.sentiment_polarity, max: 1, color: '#f87171', signed: true },
      ]
    : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Stylometry Vectors</h1>
        <p className="text-sm text-muted-400 mt-1">Multi-dimensional text analysis vectors</p>
      </div>

      {vectors.length === 0 ? (
        <div className="card p-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-600 mx-auto mb-3" />
          <p className="text-sm text-muted-400">No stylometry vectors recorded yet.</p>
          <p className="text-xs text-muted-600 mt-1">
            Vectors are generated when text samples are processed through the analysis pipeline.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Vector list */}
          <div className="card p-4 lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-200 mb-3 px-2">Samples</h2>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {vectors.map((vec) => (
                <button
                  key={vec.id}
                  onClick={() => setSelected(vec)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    selected?.id === vec.id
                      ? 'bg-primary-500/10 border border-primary-500/20'
                      : 'hover:bg-base-800/60 border border-transparent'
                  }`}
                >
                  <p className="text-sm text-slate-300 truncate">{vec.sample_label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-muted-600">{vec.vector_hash.slice(0, 12)}</span>
                    <span className="text-[10px] text-muted-600">·</span>
                    <span className="text-[10px] font-mono text-muted-600">
                      {new Date(vec.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail view */}
          <div className="lg:col-span-2 space-y-4">
            {selected && (
              <>
                {/* Radar */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-200">{selected.sample_label}</h2>
                      <p className="text-xs text-muted-500 font-mono mt-1">Hash: {selected.vector_hash}</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <VectorRadar metrics={radarMetrics} />
                  </div>
                </div>

                {/* Metric bars */}
                <div className="card p-6">
                  <h2 className="text-sm font-semibold text-slate-200 mb-4">Vector Components</h2>
                  <div className="space-y-4">
                    {metricBars.map((m, i) => {
                      const pct = m.signed
                        ? ((m.value + 1) / 2) * 100
                        : (m.value / m.max) * 100;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-slate-300">{m.label}</span>
                            <span className="text-xs font-mono text-muted-400">
                              {m.value.toFixed(4)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-base-700/60 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(to right, ${m.color}60, ${m.color})`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
