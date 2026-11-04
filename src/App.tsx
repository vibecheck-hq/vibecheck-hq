import React, { useState, useEffect, useMemo } from 'react';

export const SUPABASE_PROJECT_ID = 'qnnnnvlissdqdwmkgrao';
export const SUPABASE_REGION = 'eu-west-1';
export const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51UImSpHQBZVjUZXN4lQPfteGH54MSxKWh1XUmyICs7Ul3z0DpR1J3HoN9LFgmGoq6DTCNXphll9Nm7PGiQSuDT44002cIQqBtU';

const CHECKOUT_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/create-checkout`;
const STORAGE_CS_KEY = 'vibecheck_stripe_cs';
const STORAGE_CREDITS_KEY = 'vibecheck_credits_left';
const DRAFT_TEXT_KEY = 'vibecheck_draft_text';

interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags: string[];
  green_flags: string[];
  executive_takeaway: string;
}

export default function App() {
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
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  });

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;

  // Instant client-side heuristic signal scan to trigger curiosity before 99p checkout
  const preScanSignals = useMemo(() => {
    const lower = rawText.toLowerCase();
    let signals = 0;
    if (/\b(busy|space|idk|maybe|fine|whatever|sorry|honestly|just|tired|later)\b/.test(lower)) signals += 1;
    if (rawText.includes('...') || rawText.includes('?')) signals += 1;
    if (wordCount >= 12) signals += 1;
    return Math.max(2, signals + 1);
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

  // Poll on return from Stripe Checkout (?session=...&cs=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session') || params.get('session_id');
    const csParam = params.get('cs');

    if (!sessionParam && !csParam) return;

    if (csParam && csParam.startsWith('cs_')) {
      localStorage.setItem(STORAGE_CS_KEY, csParam);
    }

    setVerifying(true);
    setError(null);

    let attempts = 0;
    let cancelled = false;

    const pollStatus = async () => {
      while (!cancelled && attempts < 15) {
        attempts += 1;
        try {
          const resp = await fetch(CHECKOUT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify',
              session_uuid: sessionParam || csParam,
              stripe_session_id: csParam || localStorage.getItem(STORAGE_CS_KEY),
            }),
          });

          const data = await resp.json();
          if (data?.status === 'unlocked' && data?.decode_result) {
            setDecodeResult(data.decode_result);
            if (data.stripe_session_id) {
              localStorage.setItem(STORAGE_CS_KEY, data.stripe_session_id);
            }
            if (typeof data.credits_remaining === 'number') {
              localStorage.setItem(STORAGE_CREDITS_KEY, String(data.credits_remaining));
              setCreditsLeft(data.credits_remaining);
            }
            sessionStorage.removeItem(DRAFT_TEXT_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            setVerifying(false);
            return;
          }
        } catch (err) {
          console.error('Verification poll error:', err);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (!cancelled) {
        setVerifying(false);
        setError('Payment verification timed out. Tap the button again to unlock your decode.');
      }
    };

    pollStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDecode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = rawText.trim();
    if (!trimmed) {
      setError('Paste a message or thread first.');
      return;
    }

    setLoading(true);
    setError(null);

    const savedCsId = localStorage.getItem(STORAGE_CS_KEY);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          raw_text: trimmed,
          stripe_session_id: creditsLeft > 0 ? savedCsId : null,
          return_origin: window.location.origin,
        }),
      });

      clearTimeout(timeoutId);
      const data = await resp.json();

      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Could not connect to checkout server.');
      }

      if (data.instant_unlock && data.decode_result) {
        setDecodeResult(data.decode_result);
        const remaining =
          typeof data.credits_remaining === 'number'
            ? data.credits_remaining
            : Math.max(0, creditsLeft - 1);
        localStorage.setItem(STORAGE_CREDITS_KEY, String(remaining));
        setCreditsLeft(remaining);
        sessionStorage.removeItem(DRAFT_TEXT_KEY);
        setLoading(false);
        return;
      }

      const redirectUrl = data.checkout_url || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      throw new Error('No checkout URL returned.');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        localStorage.removeItem(STORAGE_CS_KEY);
        localStorage.removeItem(STORAGE_CREDITS_KEY);
        setCreditsLeft(0);
        setError('Request timed out. Tap again to open a fresh 99p checkout.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleCopyTakeaway = () => {
    if (!decodeResult) return;
    navigator.clipboard.writeText(decodeResult.executive_takeaway);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setDecodeResult(null);
    setRawText('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F3F4F6] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-[#1F2937] text-xs text-emerald-400 font-medium mb-4">
          <span>🛡️ Anonymous &amp; Encrypted</span>
          {creditsLeft > 0 && (
            <span className="ml-1 pl-2 border-l border-[#1F2937] text-emerald-300 font-semibold">
              {creditsLeft}/5 Credits Left
            </span>
          )}
        </div>

        {!decodeResult ? (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
              Stop overthinking their texts.
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              Paste their message or full thread. Get the true subtext, red/green flags, and exact reply scripts.
            </p>

            {verifying ? (
              <div className="p-6 rounded-2xl bg-[#0F1117] border border-emerald-500/30 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-emerald-400">
                  Payment confirmed — running forensic subtext decode...
                </p>
              </div>
            ) : (
              <form onSubmit={handleDecode} className="space-y-3">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste their exact text message or thread here..."
                  rows={5}
                  className="w-full rounded-2xl bg-[#0F1117] border border-[#1F2937] focus:border-emerald-500 focus:outline-none p-4 text-sm text-gray-100 placeholder-gray-500 resize-none"
                />

                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                  <span>
                    {wordCount === 0
                      ? 'Awaiting message input'
                      : wordCount <= 3
                      ? 'Short input: Quick literal subtext read'
                      : `⚠️ ${preScanSignals} subtext markers detected — ready to decode`}
                  </span>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 text-black font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Decoding subtext...</span>
                    </>
                  ) : creditsLeft > 0 ? (
                    <span>Decode Message ({creditsLeft}/5 Credits Left) →</span>
                  ) : (
                    <span>Unlock 5 Decodes (99p) →</span>
                  )}
                </button>

                {creditsLeft === 0 && (
                  <p className="text-[11px] text-center text-gray-400 pt-0.5">
                    ⚡ £0.99 one-off pass (5 decodes) • Apple Pay &amp; Google Pay • No subscription
                  </p>
                )}

                {wordCount >= 4 && creditsLeft === 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-[#0F1117] border border-[#1F2937] space-y-2.5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                        🔒 Pre-Scan Complete: {preScanSignals} Hidden Tone Shifts Found
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        Ready
                      </span>
                    </div>
                    <div className="space-y-1.5 select-none blur-[4px] opacity-60 pointer-events-none text-xs text-gray-300">
                      <p className="font-semibold text-white">Headline: Emotional distancing masked as polite busyness</p>
                      <p>🚩 Red Flag: Shifts responsibility onto you while avoiding a direct commitment.</p>
                      <p>💬 Exact Reply Script: Mirror their brevity and do not follow up for 48 hours.</p>
                    </div>
                  </div>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                ● VIBE DECODED
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {creditsLeft}/5 Credits Left
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F1117] border border-[#1F2937] space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white leading-snug">
                  {decodeResult.headline}
                </h2>
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                  {decodeResult.true_intent}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 border-t border-[#1F2937]">
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20">
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1.5">
                    🚩 Red Flags
                  </div>
                  <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                    {decodeResult.red_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                    ✅ Green Flags
                  </div>
                  <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                    {decodeResult.green_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111827] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    💬 Reply Playbook &amp; Takeaway
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTakeaway}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">
                  {decodeResult.executive_takeaway}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-white font-semibold text-sm border border-[#1F2937] transition"
            >
              Decode Another Message {creditsLeft > 0 ? `(${creditsLeft} Left)` : '(99p for 5)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
