import { useState, type FormEvent } from 'react';
import { Activity, ArrowRight, Loader2, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { triggerSubtextCheckout } from '@/lib/stripe';
import { AuthModal } from '@/components/AuthModal';

interface SubtextPaywallProps {
  /** Date of birth for the target being analyzed (ISO yyyy-mm-dd). */
  targetDob: string;
  /** Optional callback after checkout is successfully initiated. */
  onCheckoutStarted?: () => void;
}

export function SubtextPaywall({ targetDob, onCheckoutStarted }: SubtextPaywallProps) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setAuthMode('signup');
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    try {
      await triggerSubtextCheckout(targetDob);
      onCheckoutStarted?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Checkout failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card p-8 relative animate-slide-up">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-500 text-base-950 text-xs font-semibold">
          Clarity Pro
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-base-950" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Subtext Engine</h3>
            <p className="text-xs text-muted-500">Unlock the deep-pattern analysis layer</p>
          </div>
        </div>

        <p className="text-sm text-muted-400 leading-relaxed">
          The Subtext Engine surfaces behavioral patterns and latent signatures from your
          telemetry data. This upgrade unlocks full stylometric vectors, phenotype
          correlation, and longitudinal drift detection.
        </p>

        <ul className="mt-6 space-y-3">
          {[
            'Deep stylometric vector analysis',
            'Phenotype correlation mapping',
            'Longitudinal drift detection',
            'Unlimited session archiving',
          ].map((feat, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-400">
              <div className="w-4 h-4 rounded-full bg-primary-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                <Activity className="w-2.5 h-2.5 text-primary-400" strokeWidth={3} />
              </div>
              {feat}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-400 mb-1.5">
              Target Date of Birth
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-600" />
              <input
                type="date"
                required
                value={targetDob}
                readOnly
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-base-800 border border-base-700 text-sm text-slate-200 placeholder-muted-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all cursor-not-allowed"
              />
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-error-500/10 border border-error-500/30 text-sm text-error-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {user ? 'Unlock Clarity Pro' : 'Sign Up to Continue'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-600">
          Secure checkout via Stripe. Cancel anytime.
        </p>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
