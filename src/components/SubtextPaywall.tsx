import React, { useState, useRef } from 'react';
import { triggerSubtextCheckout } from '../lib/stripe';
import { Lock, Zap, BrainCircuit } from 'lucide-react';

export default function SubtextPaywall() {
  const [inputText, setInputText] = useState('');
  const [latencyAlert, setLatencyAlert] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastKeyTime = useRef<number>(Date.now());

  // Real-time Motor Fatigue / Hesitation Tracker
  const handleKeystroke = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const now = Date.now();
    const delta = (now - lastKeyTime.current) / 1000;
    lastKeyTime.current = now;

    // Trigger anxiety hook if user pauses (hesitation) and has typed more than 5 words
    if (delta > 1.482 && e.target.value.split(/\s+/).length > 5) {
      setLatencyAlert(true);
    }
  };

  const handleUnlock = async () => {
    setIsProcessing(true);
    // Hardcoded target DOB for the MVP flow, can be extracted to a UI input later
    await triggerSubtextCheckout('1995-08-15'); 
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-[#0d1117] text-[#00ffcc] font-mono w-full max-w-lg mx-auto border border-[#30363d] shadow-2xl rounded-lg">
      <div className="border-b border-[#30363d] pb-3 mb-2 flex items-center justify-between">
        <h2 className="text-lg uppercase tracking-widest text-[#00ffcc] flex items-center gap-2 m-0">
          <BrainCircuit size={20} />
          Subtext Engine
        </h2>
        <span className="text-[10px] bg-[#161b22] px-2 py-1 rounded border border-[#30363d]">v3.5 LIVE</span>
      </div>

      <div className="bg-[#161b22] p-4 border border-[#30363d] rounded">
        <label className="text-xs text-[#00aa88] uppercase mb-2 block font-bold">Decode Their Intent:</label>
        <textarea
          className="w-full h-28 bg-[#0d1117] border border-[#30363d] text-white p-3 resize-none focus:outline-none focus:border-[#00aaff] transition-colors rounded"
          placeholder="Paste the confusing text message or email here..."
          value={inputText}
          onChange={handleKeystroke}
        />
      </div>

      {latencyAlert && (
        <div className="border-l-4 border-[#ff3366] bg-[rgba(255,51,102,0.1)] text-[#ff3366] p-3 text-xs animate-pulse">
          <strong>▲ HIGH COGNITIVE STRAIN DETECTED</strong><br/>
          Your input latency indicates extreme hesitation. The target's subtext contains conflicting emotional markers.
        </div>
      )}

      {/* Robert Protocol 3.0: Visual Anchor Hierarchy */}
      <button 
        onClick={handleUnlock}
        disabled={isProcessing || inputText.length < 10}
        className={`w-full py-4 px-4 uppercase tracking-wide border-none rounded-md transition-all flex justify-between items-center group ${
          inputText.length < 10 
            ? 'bg-[#161b22] text-[#888] cursor-not-allowed' 
            : 'bg-[#00aaff] hover:bg-[#0088cc] text-black font-bold cursor-pointer shadow-[0_0_15px_rgba(0,170,255,0.4)]'
        }`}
      >
        <span className="flex flex-col items-start">
          <span className="text-base flex items-center gap-2">
            {isProcessing ? 'Initializing Secure Route...' : 'Unlock Deep Analysis'}
          </span>
          <span className="text-[10px] font-normal mt-1 opacity-80 flex items-center gap-1">
            <Lock size={10} /> Stripe Authenticated • £9.99/mo
          </span>
        </span>
        <Zap size={18} className={`${inputText.length >= 10 && !isProcessing ? 'group-hover:translate-x-1 transition-transform' : 'opacity-50'}`} />
      </button>
    </div>
  );
}
