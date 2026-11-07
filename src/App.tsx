import React, { useState, useEffect, useMemo } from 'react';
import { TelemetryTracker, useTelemetryStore, computeCMTEMetrics } from './stores/useTelemetryStore';

export const SUPABASE_PROJECT_ID = 'gnnmlimzddkgnmmleatp';
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51T96r82L4948qp2C9781f90f56C9781f90f56';

const CHECKOUT_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/create-checkout`;
const STORAGE_SESSION_KEY = 'vibecheck_session_id';
const STORAGE_CREDITS_KEY = 'vibecheck_credits_left';
const DRAFT_TEXT_KEY = 'vibecheck_draft_text';
const TELEMETRY_SESSION_KEY = 'vibecheck_telemetry_sid';

interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags: string[];
  green_flags: string[];
  execution_takeaway: string;
}

export default function App() {
  const [telemetrySessionId] = useState<string>(() => {
    const existing = sessionStorage.getItem(TELEMETRY_SESSION_KEY);
    if (existing) return existing;
    const generated = `vc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(TELEMETRY_SESSION_KEY, generated);
    return generated;
  });

  const [rawText, setRawText] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilled = params.get('text') || params.get('q');
    if (prefilled) {
      sessionStorage.setItem(DRAFT_TEXT_KEY, prefilled);
      return prefilled;
    }
    return sessionStorage.getItem(DRAFT_TEXT_KEY) || '';
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [creditsLeft, setCreditsLeft] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_CREDITS_KEY);
    const parsed = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  });

  const wordCount = useMemo(() => {
    return rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [rawText]);

  // Instant client-side heuristic signal scan to trigger curiosity before £2.99 checkout
  const previewScan = useMemo(() => {
    const lower = rawText.toLowerCase();
    let signals = 0;
    if (/(\bmaybe\b|\bsoon\b|\bbusy\b|\blater\b|\bsee how\b|\bhaha\b|\blol\b|\bok\b|\bsure\b|\bfine\b)/.test(lower)) signals += 1;
    if (rawText.includes('...') || rawText.includes('?') || rawText.includes('!')) signals += 1;
    if (wordCount >= 4) signals += 1;
    return Math.min(3, Math.max(1, signals));
  }, [rawText, wordCount]);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_TEXT_KEY, rawText);
  }, [rawText]);

  // Keep Edge Function warm
  useEffect(() => {
    fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'x-ping': 'keep-alive' },
    }).catch(() => {});
  }, []);

  // Poll on return from Stripe Checkout (?session_id=cs_...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const csParam = params.get('session_id') || params.get('stripe_session_id');
    const successParam = params.get('success');

    if (!successParam && !csParam) return;

    if (csParam && csParam.startsWith('cs_')) {
      localStorage.setItem(STORAGE_SESSION_KEY, csParam);
    }

    setVerifying(true);
    setError(null);

    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      while (!cancelled && attempts < 15) {
        attempts += 1;
        try {
          const resp = await fetch(CHECKOUT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify',
              text: sessionStorage.getItem(DRAFT_TEXT_KEY) || rawText,
              stripe_session_id: csParam || localStorage.getItem(STORAGE_SESSION_KEY),
            }),
          });

          const data = await resp.json();
          if (data.status === 'unlocked' && data.decode_result) {
            setDecodeResult(data.decode_result);
            if (data.stripe_session_id) {
              localStorage.setItem(STORAGE_SESSION_KEY, data.stripe_session_id);
            }
            if (typeof data.credits_remaining === 'number') {
              setCreditsLeft(data.credits_remaining);
              localStorage.setItem(STORAGE_CREDITS_KEY, String(data.credits_remaining));
            }
            sessionStorage.removeItem(DRAFT_TEXT_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            setVerifying(false);
            return;
          }
        } catch (err) {
          console.error('Verification poll error:', err);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!cancelled) {
        setVerifying(false);
        setError('Payment verification timed out. Tap the button again to unlock your decode.');
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [rawText]);

  const handleDecode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = rawText.trim();
    if (!trimmed) {
      setError('Paste a message or thread first.');
      return;
    }

    setLoading(true);
    setError(null);

    // Push & flush CMTE telemetry snapshot on decode intent
    const metrics = computeCMTEMetrics(trimmed, 0, 0.5);
    useTelemetryStore.pushEvent({
      session_id: localStorage.getItem(STORAGE_SESSION_KEY) || telemetrySessionId,
      avg_word_length: metrics.avg_word_length,
      clause_nesting_index: metrics.clause_nesting_index,
      motor_jitter_ms: 0,
      payload: {
        event_type: 'decode_submit',
        linguistic_precision: metrics.linguistic_precision,
        delta_divergence: metrics.delta_divergence,
        resource_shunting_active: metrics.resource_shunting_active,
        biorhythm_23d_phase: metrics.biorhythm_23d_phase,
        surface_pressure: metrics.surface_pressure,
        word_count: metrics.word_count,
        timestamp: Date.now(),
      },
    });
    useTelemetryStore.flushBatch();

    const savedSessionId = localStorage.getItem(STORAGE_SESSION_KEY);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: trimmed,
          stripe_session_id: creditsLeft > 0 ? savedSessionId : null,
          return_origin: window.location.origin,
        }),
      });

      clearTimeout(timeoutId);
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Could not connect to checkout server.');
      }

      if (data.instant_unlock && data.decode_result) {
        setDecodeResult(data.decode_result);
        if (typeof data.credits_remaining === 'number') {
          setCreditsLeft(data.credits_remaining);
          localStorage.setItem(STORAGE_CREDITS_KEY, String(data.credits_remaining));
        }
        sessionStorage.removeItem(DRAFT_TEXT_KEY);
        setLoading(false);
        return;
      }

      const redirectUrl = data.checkout_url || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No checkout URL returned.');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_CREDITS_KEY);
      setCreditsLeft(0);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Tap again to open a fresh £2.99 checkout.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleCopyTakeaway = () => {
    if (!decodeResult) return;
    navigator.clipboard.writeText(decodeResult.execution_takeaway);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setDecodeResult(null);
    setRawText('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col items-center justify-center p-4 sm:p-6">
      <TelemetryTracker
        sessionId={localStorage.getItem(STORAGE_SESSION_KEY) || telemetrySessionId}
        activeText={rawText}
      />
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-3 px-3 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-emerald-400 text-xs font-medium w-fit mx-auto">
          <span>🔮 VibeCheck AI</span>
          {creditsLeft > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
              {creditsLeft} {creditsLeft === 1 ? 'Credit' : 'Credits'} Left
            </span>
          )}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            Stop Overthinking Their Texts.
          </h1>
          <p className="text-sm text-gray-400 mb-3">
            Paste their message or full thread. Get the true subtext, red/green flags, and exact reply script.
          </p>
          <div className="px-3 py-2 rounded-xl bg-[#111115] border border-emerald-500/30 text-center space-y-1">
            <p className="text-xs font-semibold text-emerald-300">
              ⚡ Instant 5-Message Decode Pass — £2.99
            </p>
            <p className="text-[11px] text-gray-400">
              Decode up to 5 messages or full threads • One-time pass • No account or subscription
            </p>
          </div>
        </div>

        {verifying ? (
          <div className="p-6 rounded-2xl bg-[#18181B] border border-[#27272A] text-center space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-emerald-400">
              Payment verified! Decoding your message now...
            </p>
          </div>
        ) : !decodeResult ? (
          <form onSubmit={handleDecode} className="space-y-4">
            <div className="relative">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste their exact text message or thread here..."
                rows={5}
                className="w-full rounded-2xl bg-[#18181B] border border-[#27272A] focus:border-emerald-500 focus:outline-none p-4 text-sm text-gray-100 placeholder-gray-500 resize-none"
              />
              {wordCount > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[#141418] border border-[#27272A]">
                  <span className="text-gray-400">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'} Analysed
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {wordCount < 4
                      ? 'Short input: Quick literal subtext read'
                      : `${previewScan} high-ambiguity subtext markers detected — ready to decode`}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-black font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Opening decoding session...</span>
                </>
              ) : creditsLeft > 0 ? (
                <span>⚡ Decode Message Now ({creditsLeft} Left)</span>
              ) : (
                <span>🔓 Unlock 5-Message Decode Pass — £2.99</span>
              )}
            </button>

            {creditsLeft === 0 && (
              <p className="text-[11px] text-center text-gray-400 pt-0.5">
                🔒 £2.99 one-off pass (5 decodes) • Apple Pay &amp; Google Pay • No subscription
              </p>
            )}

            {wordCount > 0 && creditsLeft === 0 && (
              <div className="p-4 rounded-2xl bg-[#141418] border border-[#27272A] space-y-2.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    🔒 Pre-Scan Complete: {previewScan} Hidden Tone Shifts Found
                  </span>
                  <span className="text-[11px] font-medium text-emerald-400">
                    £2.99 Pass (5x)
                  </span>
                </div>
                <div className="space-y-1.5 select-none blur-[3px] opacity-60 pointer-events-none text-xs text-gray-300">
                  <p>• True Intent: Testing your investment level while keeping plausible deniability...</p>
                  <p>• Red Flag: Low-effort phrasing masks a deliberate pullback in priority...</p>
                  <p>• Exact Reply Script: Mirror their brevity and do not follow up for 24 hours...</p>
                </div>
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                ⚡ Vibe Decoded
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {creditsLeft}/5 Credits Left
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2">
              <h2 className="text-lg font-bold text-white leading-snug">
                {decodeResult.headline}
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                {decodeResult.true_intent}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-2">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  🚩 Red Flags
                </h3>
                <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                  {decodeResult.red_flags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  ✅ Green Flags
                </h3>
                <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                  {decodeResult.green_flags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111815] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  💬 Exact Reply Playbook &amp; Takeaway
                </span>
                <button
                  type="button"
                  onClick={handleCopyTakeaway}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                {decodeResult.execution_takeaway}
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-white font-semibold text-xs border border-[#27272A] transition"
            >
              Decode Another Message ({creditsLeft > 0 ? `${creditsLeft}/5 Credits Left` : '£2.99 for 5'})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
