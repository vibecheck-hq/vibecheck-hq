import { useEffect, useState } from 'react';
import { CreditCard, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { supabase, E_ABS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { SubscriptionPlan } from '@/types';
import { EnergyAnchor } from '@/components/charts';

export function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPlans(data as SubscriptionPlan[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-sm text-muted-400 mt-1">Account and subscription configuration</p>
        </div>
        <EnergyAnchor />
      </div>

      {/* Account info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <SettingsIcon className="w-5 h-5 text-primary-400" />
          <h2 className="text-sm font-semibold text-slate-200">Account</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-base-700/30">
            <span className="text-sm text-muted-400">Email</span>
            <span className="text-sm text-slate-200 font-mono">{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-base-700/30">
            <span className="text-sm text-muted-400">User ID</span>
            <span className="text-sm text-slate-200 font-mono">{user?.id ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-400">Auth Method</span>
            <span className="text-sm text-slate-200">Email / Password</span>
          </div>
        </div>
      </div>

      {/* Subscription plans */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="w-5 h-5 text-primary-400" />
          <h2 className="text-sm font-semibold text-slate-200">Subscription Plans</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg border p-5 ${
                  plan.name === 'Pro'
                    ? 'border-primary-500/30 bg-primary-500/5'
                    : 'border-base-700/60 bg-base-800/40'
                }`}
              >
                <h3 className="text-sm font-semibold text-slate-100">{plan.name}</h3>
                <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">
                  ${Math.floor(plan.price_cents / 100)}
                  <span className="text-xs text-muted-500 font-normal">/mo</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-5 w-full px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    plan.name === 'Free'
                      ? 'bg-base-700 text-muted-400 cursor-default'
                      : 'bg-primary-500 text-base-950 hover:bg-primary-400'
                  }`}
                  disabled={plan.name === 'Free'}
                >
                  {plan.name === 'Free' ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
                {!plan.stripe_price_id && plan.name !== 'Free' && (
                  <p className="text-[10px] text-muted-600 mt-2 text-center">
                    Stripe not yet connected
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System info */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">System Constants</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-base-700/30">
            <span className="text-sm text-muted-400">E_ABS (Thermodynamic Anchor)</span>
            <span className="constant-ref">{E_ABS.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-base-700/30">
            <span className="text-sm text-muted-400">Architecture Protocol</span>
            <span className="text-sm text-slate-200 font-mono">RW-IDP v1.0</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-400">Execution Model</span>
            <span className="text-sm text-slate-200">Deterministic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
