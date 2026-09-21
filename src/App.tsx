import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, RefreshCcw, Fingerprint } from 'lucide-react';

const supabaseUrl = 'https://qnnnnvlissdqdwmkgrao.supabase.co';
const supabaseAnonKey = 'EyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubm5udmxpc3NkcWR3bWtncmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjY5MjcsImV4cCI6MjEwMzAwMjkyN30.LesQ_v4RJD5Gc4zOxociV8wl-fbSXnIerahwenYGv4k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      setSessionUuid(session);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 font-sans selection:bg-[#22C55E] selection:text-black">
      {sessionUuid ? <RevealPage sessionUuid={sessionUuid} /> : <LandingPage />}
    </div>
  );
}

function LandingPage() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    if (!inputText.trim()) {
      setError("Please paste a message first.");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://qnnnnvlissdqdwmkgrao.supabase.co/functions/v1/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          raw_text: inputText, 
          return_origin: window.location.origin 
        })
      });

      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection unstable. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 max-w-[390px] mx-auto relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#22C55E]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full space-y-8 relative z-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
            <Fingerprint className="w-3 h-3 text-[#22C55E]" />
            <span>Anonymous & Encrypted</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">Stop overthinking <br/>their texts.</h1>
          <p className="text-gray-400 text-lg">Paste their ambiguous message. We'll tell you exactly what they mean.</p>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste their confusing message here..."
          className="w-full h-40 p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/50 outline-none resize-none transition-all text-gray-100 placeholder-gray-600 shadow-xl"
        />

        {error && <p className="text-red-400 text-sm font-medium pl-2">{error}</p>}

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-[#22C55E] hover:bg-[#1ea951] active:scale-[0.98] text-black font-bold py-4 rounded-2xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Analyzing syntax...</span>
            </>
          ) : (
            <>
              <span className="text-lg">Decode Their Vibe (£2.99)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </main>
  );
}

function RevealPage({ sessionUuid }: { sessionUuid: string }) {
  const [result, setResult] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let pollInterval: any;

    const fetchResult = async () => {
      const { data, error } = await supabase
        .from('decode_jobs')
        .select('*')
        .eq('id', sessionUuid)
        .single();

      if (data && data.status === 'unlocked' && data.decode_result) {
        setResult(data.decode_result);
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    };

    fetchResult();
    
    if (isPolling) {
      pollInterval = setInterval(fetchResult, 2000);
    }

    return () => clearInterval(pollInterval);
  }, [sessionUuid, isPolling]);

  const handleReset = () => {
    window.location.href = window.location.origin;
  };

  if (isPolling || !result) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="relative">
          <div className="absolute inset-0 bg-[#22C55E] blur-[30px] opacity-20 rounded-full" />
          <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin mb-6 relative z-10" />
        </div>
        <p className="text-sm font-mono text-[#22C55E] tracking-widest uppercase animate-pulse">Decrypting Matrix</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-[390px] mx-auto py-12 space-y-6 animate-in fade-in duration-700">
      <div className="space-y-3">
        <div className="inline-block px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full text-xs font-mono text-[#22C55E] mb-2">
          ● VIBE DECODED
        </div>
        <h1 className="text-3xl font-bold text-white leading-tight">{result.headline}</h1>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl transition-all duration-500 hover:border-white/20">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">True Intent</h3>
          <p className="text-gray-100 text-lg leading-relaxed">{result.true_intent}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Red Flags</h3>
            <ul className="text-sm text-red-200/80 space-y-2">
              {result.red_flags?.map((flag: string, i: number) => <li key={i} className="leading-snug">• {flag}</li>)}
            </ul>
          </div>
          <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-3">Green Flags</h3>
            <ul className="text-sm text-[#22C55E]/80 space-y-2">
              {result.green_flags?.map((flag: string, i: number) => <li key={i} className="leading-snug">• {flag}</li>)}
            </ul>
          </div>
        </div>

        <div className="pt-5 border-t border-white/10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Executive Takeaway</h3>
          <p className="text-[#22C55E] font-semibold text-lg">{result.executive_takeaway}</p>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="w-full flex items-center justify-center space-x-2 bg-transparent border border-gray-800 text-gray-400 hover:text-white hover:bg-white/5 py-4 rounded-2xl transition-all mt-8"
      >
        <RefreshCcw className="w-4 h-4" />
        <span className="font-medium">Decode Another Message</span>
      </button>
    </main>
  );
}
