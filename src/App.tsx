import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, RefreshCcw, Fingerprint, Sparkles, ShieldAlert, CheckCircle2 } from 'lucide-react';

const supabaseUrl = 'https://qnnnnvlissdqdwmkgrao.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubm5udmxpc3NkcWR3bWtncmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjY5MjcsImV4cCI6MjEwMzAwMjkyN30.LesQ_v4RJD5Gc4zOxociV8wl-fbSXnIerahwenYGv4k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STORAGE_CS_KEY = 'vibecheck_stripe_cs';
const STORAGE_CREDITS_KEY = 'vibecheck_credits_left';

export default function App() {
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [preloadedResult, setPreloadedResult] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const cs = params.get('cs');
    if (session) {
      setSessionUuid(session);
    }
    if (cs) {
      setStripeSessionId(cs);
      localStorage.setItem(STORAGE_CS_KEY, cs);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 font-sans selection:bg-[#22C55E] selection:text-black">
      {sessionUuid || preloadedResult ? (
        <RevealPage
          sessionUuid={sessionUuid}
          stripeSessionId={stripeSessionId}
          preloadedResult={preloadedResult}
          onReset={() => {
            setPreloadedResult(null);
            setSessionUuid(null);
            window.history.replaceState({}, '', window.location.origin);
          }}
        />
      ) : (
        <LandingPage
          onInstantUnlock={(result, jobId, csId, creditsLeft) => {
            if (csId) localStorage.setItem(STORAGE_CS_KEY, csId);
            localStorage.setItem(STORAGE_CREDITS_KEY, String(creditsLeft));
            setPreloadedResult(result);
            setSessionUuid(jobId);
          }}
        />
      )}
    </div>
  );
}

function LandingPage({
  onInstantUnlock,
}: {
  onInstantUnlock: (result: any, jobId: string, csId: string, creditsLeft: number) => void;
}) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedCs, setSavedCs] = useState<string | null>(null);
  const [creditsLeft, setCreditsLeft] = useState<number>(0);

  useEffect(() => {
    const cs = localStorage.getItem(STORAGE_CS_KEY);
    const savedCreds = parseInt(localStorage.getItem(STORAGE_CREDITS_KEY) || '0', 10);
    if (cs) setSavedCs(cs);
    if (!isNaN(savedCreds) && savedCreds > 0) setCreditsLeft(savedCreds);
  }, []);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleCheckout = async () => {
    if (!inputText.trim()) {
      setError('Please paste a message first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        'https://qnnnnvlissdqdwmkgrao.supabase.co/functions/v1/create-checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_text: inputText.trim(),
            stripe_session_id: savedCs,
            return_origin: window.location.origin,
          }),
        }
      );

      const data = await response.json();

      if (data.instant_unlock && data.decode_result) {
        onInstantUnlock(
          data.decode_result,
          data.session_id,
          data.stripe_session_id || savedCs || '',
          typeof data.credits_remaining === 'number' ? data.credits_remaining : Math.max(0, creditsLeft - 1)
        );
        return;
      }

      const targetUrl = data.checkout_url || data.url;
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        throw new Error(data.error || 'No checkout URL returned.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Connection unstable. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 max-w-[420px] mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#22C55E]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full space-y-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
              <Fingerprint className="w-3 h-3 text-[#22C55E]" />
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
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste their confusing message or conversation thread here..."
            className="w-full h-44 p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/50 outline-none resize-none transition-all text-gray-100 placeholder-gray-600 shadow-xl"
          />
          <div className="flex justify-between items-center px-2 text-xs text-gray-500">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span>
              {wordCount === 0
                ? 'Tip: Paste the full exchange for deeper accuracy'
                : wordCount <= 3
                ? 'Short input: Quick literal subtext read'
                : 'Deep forensic analysis + reply scripts unlocked'}
            </span>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm font-medium pl-2">{error}</p>}

        <button
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
  preloadedResult?: any;
  onReset: () => void;
}) {
  const [result, setResult] = useState<any>(preloadedResult || null);
  const [isPolling, setIsPolling] = useState(!preloadedResult);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_CREDITS_KEY);
    return saved !== null ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (preloadedResult) {
      setResult(preloadedResult);
      setIsPolling(false);
      return;
    }

    let pollInterval: any;
    let isMounted = true;

    const fetchResult = async () => {
      try {
        const verifyRes = await fetch(
          'https://qnnnnvlissdqdwmkgrao.supabase.co/functions/v1/create-checkout',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify',
              session_uuid: sessionUuid,
              stripe_session_id: stripeSessionId || localStorage.getItem(STORAGE_CS_KEY),
            }),
          }
        );

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData?.status === 'unlocked' && verifyData?.decode_result) {
            if (isMounted) {
              setResult(verifyData.decode_result);
              if (verifyData.stripe_session_id) {
                localStorage.setItem(STORAGE_CS_KEY, verifyData.stripe_session_id);
              }
              if (typeof verifyData.credits_remaining === 'number') {
                setCreditsRemaining(verifyData.credits_remaining);
                localStorage.setItem(STORAGE_CREDITS_KEY, String(verifyData.credits_remaining));
              }
              setIsPolling(false);
              clearInterval(pollInterval);
            }
          }
        }
      } catch (err) {
        console.error('Verification poll error:', err);
      }
    };

    fetchResult();

    if (isPolling) {
      pollInterval = setInterval(fetchResult, 2500);
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [sessionUuid, stripeSessionId, isPolling, preloadedResult]);

  if (isPolling || !result) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="relative">
          <div className="absolute inset-0 bg-[#22C55E] blur-[30px] opacity-20 rounded-full" />
          <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin mb-6 relative z-10" />
        </div>
        <p className="text-sm font-mono text-[#22C55E] tracking-widest uppercase animate-pulse">
          Decrypting Subtext Matrix
        </p>
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
            <ShieldAlert className="w-4 h-4" />
            <span>Red Flags & Caution Signals</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-300 list-disc pl-4">
            {result.red_flags.map((flag: string, i: number) => (
              <li key={i} className="leading-relaxed">{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(result.green_flags) && result.green_flags.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#22C55E]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Green Flags & Baseline Signals</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-300 list-disc pl-4">
            {result.green_flags.map((flag: string, i: number) => (
              <li key={i} className="leading-relaxed">{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white/5 border border-[#22C55E]/30 space-y-2">
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#22C55E]">
          Executive Takeaway & Reply Playbook
        </h2>
        <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-line">{result.executive_takeaway}</p>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center space-x-2 bg-[#22C55E] hover:bg-[#1ea951] text-black font-bold py-4 rounded-2xl transition-all"
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
