import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowRight, RefreshCcw } from 'lucide-react';

// Initialize Supabase (Using the public anon key for safe client-side reads)
const supabaseUrl = 'https://qnnnnvlissdqdwmkgrao.supabase.co';
const supabaseAnonKey = 'EyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubm5udmxpc3NkcWR3bWtncmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjY5MjcsImV4cCI6MjEwMzAwMjkyN30.LesQ_v4RJD5Gc4zOxociV8wl-fbSXnIerahwenYGv4k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  
  useEffect(() => {
    // Check URL for ?session=UUID on component mount
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

// ==========================================
// STATE 1: THE LANDING PAGE
// ==========================================
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
        // The Insula-Bypass: Redirect to Stripe Apple/Google Pay
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to decryption matrix. Try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 max-w-[390px] mx-auto">
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Stop overthinking their texts.</h1>
          <p className="text-gray-400 text-lg">Paste their ambiguous message. We'll tell you exactly what they mean.</p>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste their confusing message here..."
          className="w-full h-40 p-4 bg-gray-900 border border-gray-800 rounded-2xl focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] outline-none resize-none transition-all text-gray-200 placeholder-gray-600"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-[#22C55E] hover:bg-[#1ea951] active:scale-95 text-black font-bold py-4 rounded-full transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Analyzing subtext vectors...</span>
            </>
          ) : (
            <>
              <span>Decode Their Vibe (£2.99)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </main>
  );
}

// ==========================================
// STATE 2: THE REVEAL PAGE
// ==========================================
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

    // Initial fetch
    fetchResult();
    
    // Poll every 2 seconds if not unlocked
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
        <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin mb-4" />
        <p className="text-xl font-mono text-gray-300 animate-pulse">Decrypting matrix...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-[390px] mx-auto py-12 space-y-6">
      <div className="space-y-2">
        <div className="inline-block px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs font-mono text-gray-400 mb-2">
          VIBE DECODED
        </div>
        <h1 className="text-3xl font-bold text-white leading-tight">{result.headline}</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-2xl">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">True Intent</h3>
          <p className="text-gray-200 text-lg">{result.true_intent}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Red Flags</h3>
            <ul className="text-sm text-red-200 space-y-1">
              {result.red_flags?.map((flag: string, i: number) => <li key={i}>• {flag}</li>)}
            </ul>
          </div>
          <div className="bg-green-950/30 border border-green-900/50 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-2">Green Flags</h3>
            <ul className="text-sm text-green-200 space-y-1">
              {result.green_flags?.map((flag: string, i: number) => <li key={i}>• {flag}</li>)}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Executive Takeaway</h3>
          <p className="text-[#22C55E] font-medium">{result.executive_takeaway}</p>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="w-full flex items-center justify-center space-x-2 bg-transparent border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 py-4 rounded-full transition-colors mt-8"
      >
        <RefreshCcw className="w-4 h-4" />
        <span>Decode Another Message</span>
      </button>
    </main>
  );
}
