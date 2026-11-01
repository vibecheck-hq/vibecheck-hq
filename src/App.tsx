import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ArrowRight,
  RefreshCcw,
  Fingerprint,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';

const CHECKOUT_ENDPOINT = 'https://qnnnnvlissdqdwmkgrao.supabase.co/functions/v1/create-checkout';
const STORAGE_CS_KEY = 'vibecheck_stripe_cs';
const STORAGE_CREDITS_KEY = 'vibecheck_credits_left';
const STORAGE_DRAFT_KEY = 'vibecheck_draft_text';

export interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags?: string[];
  green_flags?: string[];
  executive_takeaway: string;
}

interface EdgeFunctionResponse {
  url?: string;
  checkout_url?: string;
  instant_unlock?: boolean;
  status?: 'pending' | 'unlocked';
  decode_result?: DecodeResult;
  session_id?: string;
  stripe_session_id?: string;
  credits_remaining?: number;
  error?: string;
}

export default function App() {
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [preloadedResult, setPreloadedResult] = useState<DecodeResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const cs = params.get('cs');
    if (session) {
      setSessionUuid(session);
    }
    if (cs) {
      setStripeSessionId(cs);
      try {
        localStorage.setItem(STORAGE_CS_KEY, cs);
      } catch {
        // Ignore storage errors in restricted private browsing modes
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    setPreloadedResult(null);
    setSessionUuid(null);
    try {
      sessionStorage.removeItem(STORAGE_DRAFT_KEY);
    } catch {
      // Ignore storage errors
    }
    window.history.replaceState({}, '', window.location.origin);
  }, []);

  const handleInstantUnlock = useCallback(
    (result: DecodeResult, jobId: string, csId: string, creditsLeft: number) => {
      try {
        if (csId) localStorage.setItem(STORAGE_CS_KEY, csId);
        localStorage.setItem(STORAGE_CREDITS_KEY, String(Math.max(0, creditsLeft)));
        sessionStorage.removeItem(STORAGE_DRAFT_KEY);
      } catch {
        // Ignore storage errors
      }
      setPreloadedResult(result);
      setSessionUuid(jobId);
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 font-sans selection:bg-[#22C55E] selection:text-black">
      {sessionUuid || preloadedResult ? (
        <RevealPage
          sessionUuid={sessionUuid}
          stripeSessionId={stripeSessionId}
          preloadedResult={preloadedResult}
          onReset={handleReset}
        />
      ) : (
        <LandingPage onInstantUnlock={handleInstantUnlock} />
      )}
    </div>
  );
}

function LandingPage({
  onInstantUnlock,
}: {
  onInstantUnlock: (result: DecodeResult, jobId: string, csId: string, creditsLeft: number) => void;
}) {
  const [inputText, setInputText] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_DRAFT_KEY) || '';
    } catch {
      return '';
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [savedCs, setSavedCs] = useState<string | null>(null);
  const [creditsLeft, setCreditsLeft] = useState<number>(0);

  useEffect(() => {
    try {
      const cs = localStorage.getItem(STORAGE_CS_KEY);
      const savedCreds = parseInt(localStorage.getItem(STORAGE_CREDITS_KEY) || '0', 10);
      if (cs) setSavedCs(cs);
      if (!Number.isNaN(savedCreds) && savedCreds > 0) {
        setCreditsLeft(savedCreds);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (error) setError('');
    try {
      sessionStorage.setItem(STORAGE_DRAFT_KEY, val);
    } catch {
      // Ignore storage errors
    }
  };

  const trimmedText = inputText.trim();
  const wordCount = trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0;

  const handleCheckout = async () => {
    if (!trimmedText) {
      setError('Please paste a message first.');
      return;
    }

    setIsLoading(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          raw_text: trimmedText,
          stripe_session_id: savedCs,
          return_origin: window.location.origin,
        }),
      });

      clearTimeout(timeoutId);

      const data: EdgeFunctionResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Gateway Error (${response.status}). Please try again.`);
      }

      if (data.instant_unlock && data.decode_result) {
        const remaining =
          typeof data.credits_remaining === 'number'
            ? data.credits_remaining
            : Math.max(0, creditsLeft - 1);

        onInstantUnlock(
          data.decode_result,
          data.session_id || 'instant',
          data.stripe_session_id || savedCs || '',
          remaining
        );
        return;
      }

      const targetUrl = data.checkout_url || data.url;
      if (targetUrl) {
        window.location.assign(targetUrl);
      } else {
        throw new Error(data.error || 'No checkout URL returned.');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Request timed out. Please tap again.'
          : err instanceof Error
          ? err.message
          : 'Connection unstable. Please try again.';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 max-w-[420px] mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#22C55E]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full space-y-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
              <Fingerprint className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Anonymous & Encrypted</span>
            </div>
            {creditsLeft > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs font-mono text-[#22C55E]">
                <Sparkles className="w-3 h-3" />
                <span>{creditsLeft}/5 Decodes Left</span>
              </div>
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Stop overthinking <br /> their texts.
          </h1>
          <p className="text-gray-400 text-base">
            Paste their message or full thread. Get the true subtext, red/green flags, and exact reply scripts.
          </p>
        </div>

        <div className="space-y-2">
          <textarea
            value={inputText}
            onChange={handleTextChange}
            disabled={isLoading}
            aria-label="Paste message or conversation thread to decode"
            placeholder="Paste their confusing message or conversation thread here..."
            className="w-full h-44 p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/50 outline-none resize-none transition-all text-gray-100 placeholder-gray-600 shadow-xl disabled:opacity-50"
          />
          <div className="flex justify-between items-center px-2 text-xs text-gray-500">
            <span>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            <span>
              {wordCount === 0
                ? 'Tip: Paste the full exchange for deeper accuracy'
                : wordCount <= 3
                ? 'Short input: Quick literal subtext read'
                : 'Deep forensic analysis + reply scripts unlocked'}
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-sm font-medium pl-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-[#22C55E] hover:bg-[#1ea951] active:scale-[0.98] text-black font-bold py-4 rounded-2xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Decoding subtext...</span>
            </>
          ) : creditsLeft > 0 ? (
            <>
              <span className="text-lg">Decode Message ({creditsLeft}/5 Credits Left)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <span className="text-lg">Unlock 5 Decodes (£2.99)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </main>
  );
}

function RevealPage({
  sessionUuid,
  stripeSessionId,
  preloadedResult,
  onReset,
}: {
  sessionUuid: string | null;
  stripeSessionId: string | null;
  preloadedResult?: DecodeResult | null;
  onReset: () => void;
}) {
  const [result, setResult] = useState<DecodeResult | null>(preloadedResult || null);
  const [isPolling, setIsPolling] = useState<boolean>(!preloadedResult);
  const [pollTimedOut, setPollTimedOut] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CREDITS_KEY);
      return saved !== null ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const verifySession = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      try {
        const storedCs = (() => {
          try {
            return localStorage.getItem(STORAGE_CS_KEY);
          } catch {
            return null;
          }
        })();

        const verifyRes = await fetch(CHECKOUT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            action: 'verify',
            session_uuid: sessionUuid,
            stripe_session_id: stripeSessionId || storedCs,
          }),
        });

        if (!verifyRes.ok) return false;

        const verifyData: EdgeFunctionResponse = await verifyRes.json();

        if ((verifyData?.status === 'unlocked' || verifyData?.instant_unlock) && verifyData?.decode_result) {
          setResult(verifyData.decode_result);
          try {
            if (verifyData.stripe_session_id) {
              localStorage.setItem(STORAGE_CS_KEY, verifyData.stripe_session_id);
            }
            if (typeof verifyData.credits_remaining === 'number') {
              setCreditsRemaining(verifyData.credits_remaining);
              localStorage.setItem(STORAGE_CREDITS_KEY, String(verifyData.credits_remaining));
            }
            sessionStorage.removeItem(STORAGE_DRAFT_KEY);
          } catch {
            // Ignore storage errors
          }
          setIsPolling(false);
          setPollTimedOut(false);
          return true;
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return false;
        console.error('Verification poll error:', err);
      }
      return false;
    },
    [sessionUuid, stripeSessionId]
  );

  useEffect(() => {
    if (preloadedResult) {
      setResult(preloadedResult);
      setIsPolling(false);
      return;
    }

    if (!isPolling) return;

    const controller = new AbortController();
    let attempts = 0;
    const maxAttempts = 16; // ~40 seconds total polling window

    const runPoll = async () => {
      attempts += 1;
      const unlocked = await verifySession(controller.signal);
      if (!unlocked && attempts >= maxAttempts && !controller.signal.aborted) {
        setPollTimedOut(true);
        setIsPolling(false);
      }
    };

    runPoll();
    const pollInterval = setInterval(runPoll, 2500);

    return () => {
      controller.abort();
      clearInterval(pollInterval);
    };
  }, [isPolling, preloadedResult, verifySession]);

  const handleCopyTakeaway = async () => {
    if (!result?.executive_takeaway) return;
    try {
      await navigator.clipboard.writeText(result.executive_takeaway);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  if (isPolling || !result) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 text-center max-w-[420px] mx-auto">
        <div className="relative">
          <div className="absolute inset-0 bg-[#22C55E] blur-[30px] opacity-20 rounded-full" />
          <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin mb-6 relative z-10 mx-auto" />
        </div>
        <p className="text-sm font-mono text-[#22C55E] tracking-widest uppercase animate-pulse">
          Decrypting Subtext Matrix
        </p>
        {pollTimedOut && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-gray-400">
              Finalizing confirmation with Stripe. Tap below to refresh your decode immediately.
            </p>
            <button
              type="button"
              onClick={() => {
                setPollTimedOut(false);
                setIsPolling(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#22C55E] text-black font-semibold text-xs hover:bg-[#1ea951] transition-all"
            >
              Retry Verification
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-[420px] mx-auto py-10 space-y-6 animate-in fade-in duration-700">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-block px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full text-xs font-mono text-[#22C55E]">
            ● VIBE DECODED
          </div>
          {creditsRemaining !== null && (
            <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-gray-300">
              {creditsRemaining}/5 Credits Left
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white leading-snug">{result.headline}</h1>
      </div>

      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <h2 className="text-xs font-mono uppercase tracking-wider text-gray-400">True Subtext & Intent</h2>
        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{result.true_intent}</p>
      </div>

      {Array.isArray(result.red_flags) && result.red_flags.length > 0 && (
        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Red Flags & Caution Signals</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-300 list-disc pl-4">
            {result.red_flags.map((flag: string, i: number) => (
              <li key={i} className="leading-relaxed">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(result.green_flags) && result.green_flags.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#22C55E]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Green Flags & Baseline Signals</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-300 list-disc pl-4">
            {result.green_flags.map((flag: string, i: number) => (
              <li key={i} className="leading-relaxed">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white/5 border border-[#22C55E]/30 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#22C55E]">
            Executive Takeaway & Reply Playbook
          </h2>
          <button
            type="button"
            onClick={handleCopyTakeaway}
            className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#22C55E] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-[#22C55E]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-line">{result.executive_takeaway}</p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full flex items-center justify-center space-x-2 bg-[#22C55E] hover:bg-[#1ea951] active:scale-[0.98] text-black font-bold py-4 rounded-2xl transition-all"
      >
        <RefreshCcw className="w-4 h-4" />
        <span>
          {creditsRemaining && creditsRemaining > 0
            ? `Decode Next Message (${creditsRemaining}/5 Left)`
            : 'Decode Another Message'}
        </span>
      </button>
    </main>
  );
}
