import { useEffect, useState } from 'react';
import { Check, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { AuthModal } from '@/components/AuthModal';
import type { SubscriptionPlan } from '@/types';

interface PricingProps {
  onNavigate?: (page: 'landing' | 'dashboard') => void;
}

export function Pricing({ onNavigate }: PricingProps) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPlans(data as SubscriptionPlan[]);
      });
  }, []);

  const handleSelect = async (plan: SubscriptionPlan) => {
    setError(null);

    if (plan.name === 'Free') {
      if (user) {
        onNavigate?.('dashboard');
      } else {
        setAuthMode('signup');
        setAuthOpen(true);
      }
      return;
    }

    if (!user) {
      setAuthMode('signup');
      setAuthOpen(true);
      return;
    }

    if (!plan.stripe_price_id) {
      setError('This plan is not available yet. Please check back later.');
      return;
    }

    setLoadingPlan(plan.id);
    try {
      await createCheckoutSession(plan.stripe_price_id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Checkout failed. Please try again.'
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan, i) => {
          const isPro = plan.name === 'Pro';
          const isFree = plan.name === 'Free';
          const isLoading = loadingPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`card p-8 relative animate-slide-up ${
                isPro ? 'border-primary-500/40 shadow-lg shadow-primary-500/5' : ''
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-500 text-base-950 text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-2">
                {isPro && <Zap className="w-4 h-4 text-primary-400" />}
                <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-100">
                  ${Math.floor(plan.price_cents / 100)}
                </span>
                <span className="text-sm text-muted-500">/mo</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-400">
                    <div className="w-4 h-4 rounded-full bg-primary-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary-400" strokeWidth={3} />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isLoading}
                className={`mt-8 w-full ${isPro ? 'btn-primary' : 'btn-ghost'} ${
                  isLoading ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFree ? (
                  user ? 'Open Dashboard' : 'Start Free'
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-6 text-center text-sm text-error-400">{error}</p>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
