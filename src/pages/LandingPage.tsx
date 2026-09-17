import {
  Activity,
  ArrowRight,
  BarChart3,
  Cpu,
  Gauge,
  Layers,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { supabase, E_ABS } from '@/lib/supabase';
import { EnergyAnchor, Sparkline } from '@/components/charts';
import { AuthModal } from '@/components/AuthModal';
import { Pricing } from '@/components/Pricing';
import { useAuth } from '@/lib/auth';
import type { Page } from '@/components/Sidebar';

const heroSparkline = [
  { label: '0', value: 20 },
  { label: '1', value: 45 },
  { label: '2', value: 35 },
  { label: '3', value: 60 },
  { label: '4', value: 50 },
  { label: '5', value: 75 },
  { label: '6', value: 65 },
  { label: '7', value: 90 },
];

const features = [
  {
    icon: Activity,
    title: 'Text Telemetry',
    description:
      'Capture, stream, and visualize text-level events across your pipeline. Filter by source, severity, and event type in real-time.',
  },
  {
    icon: BarChart3,
    title: 'Stylometry Vectors',
    description:
      'Decompose text samples into multi-dimensional vectors: lexical diversity, syntactic complexity, structural entropy, readability, and sentiment polarity.',
  },
  {
    icon: Cpu,
    title: 'System Architecture Metrics',
    description:
      'Monitor throughput, latency, Shannon entropy, and thermodynamic energy across every node in your processing graph.',
  },
  {
    icon: Shield,
    title: 'Row-Level Security',
    description:
      'Every user owns their data. Supabase RLS policies enforce strict per-user isolation at the database level — no bypass possible.',
  },
  {
    icon: Zap,
    title: 'Edge Function API',
    description:
      'All backend logic runs through Deno Edge Functions with JWT-authorized, JSON-only responses. Deterministic execution per RW-IDP v1.0.',
  },
  {
    icon: Layers,
    title: 'Stripe Billing',
    description:
      'Tiered subscriptions with Free, Pro, and Enterprise plans. Usage-based limits enforced at the API layer with real-time metering.',
  },
];

const architectureSteps = [
  { icon: Terminal, label: 'Data Ingestion', detail: 'Edge Function API' },
  { icon: Gauge, label: 'Stylometry Analysis', detail: 'Vector Decomposition' },
  { icon: Cpu, label: 'Metrics Aggregation', detail: 'System Graph' },
  { icon: BarChart3, label: 'Visualization', detail: 'Dashboard Engine' },
];

interface LandingPageProps {
  onNavigate: (page: Page) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleCta = () => {
    if (user) {
      onNavigate('dashboard');
    } else {
      openAuth('signup');
    }
  };

  return (
    <div className="overflow-y-auto">
      {/* Hero */}
      <section className="relative min-h-[600px] flex items-center stat-grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-base-950/40 via-base-950/80 to-base-950" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6 animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              <span className="text-xs font-mono text-primary-300 uppercase tracking-wider">
                RW-IDP v1.0 · Deterministic Telemetry
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-slate-100 leading-[1.1] tracking-tight animate-slide-up">
              CogniMetrics
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                Telemetry Engine
              </span>
            </h1>

            <p className="mt-6 text-lg text-muted-400 leading-relaxed max-w-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              A high-performance dashboard for visualizing text telemetry, stylometry vectors,
              and system architecture metrics. Built for teams that need deterministic,
              real-time insight into their text processing pipelines.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <button onClick={handleCta} className="btn-primary">
                {user ? 'Open Dashboard' : 'Get Started Free'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigate('dashboard')} className="btn-ghost">
                View Demo
              </button>
            </div>

            <div className="mt-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <EnergyAnchor />
            </div>
          </div>

          {/* Floating preview card */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden xl:block animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="card p-6 w-80 shadow-2xl shadow-primary-500/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-500 uppercase tracking-wider">Live Throughput</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                  <span className="text-[10px] text-success-400 font-mono">ACTIVE</span>
                </div>
              </div>
              <div className="flex items-end justify-between mb-3">
                <span className="text-3xl font-bold text-slate-100 font-mono">12,847</span>
                <span className="text-xs text-success-400">+18.3%</span>
              </div>
              <Sparkline data={heroSparkline} color="#22d3ee" height={48} />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-mono font-semibold text-primary-400">42ms</p>
                  <p className="text-[10px] text-muted-500">Latency</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-mono font-semibold text-accent-400">3.87</p>
                  <p className="text-[10px] text-muted-500">Entropy</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-mono font-semibold text-success-400">99.9%</p>
                  <p className="text-[10px] text-muted-500">Uptime</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-100">Everything you need to observe</h2>
          <p className="mt-3 text-muted-400">A complete telemetry stack — from ingestion to visualization.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="card card-hover p-6 animate-slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-11 h-11 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-muted-400 leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Architecture flow */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-100">Architecture Pipeline</h2>
          <p className="mt-3 text-muted-400">Data flows through four deterministic stages.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 relative">
          {architectureSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative">
                <div className="card p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-base-800 border border-base-700 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">{step.label}</h3>
                  <p className="text-xs text-muted-500 mt-1 font-mono">{step.detail}</p>
                </div>
                {i < architectureSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2.5 w-5 h-px bg-gradient-to-r from-primary-500/40 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-100">Simple, transparent pricing</h2>
          <p className="mt-3 text-muted-400">Start free. Scale when you need it.</p>
        </div>

        <Pricing onNavigate={onNavigate} />
      </section>

      {/* Footer */}
      <footer className="border-t border-base-700/60 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-muted-400">CogniMetrics Telemetry Engine</span>
          </div>
          <p className="text-xs text-muted-600 font-mono">RW-IDP v1.0 · E_ABS = {E_ABS.toFixed(4)}</p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}
