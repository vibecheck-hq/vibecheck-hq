import React from 'react';
import SubtextPaywall from '../components/SubtextPaywall';
import { Eye, MessageSquareOff } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-4">
      
      {/* The Demographic Hook (From World Demographics Data) */}
      <div className="max-w-xl text-center mb-8 mt-10">
        <div className="flex justify-center mb-4">
          <div className="bg-[#161b22] p-3 rounded-full border border-[#30363d]">
            <Eye size={32} className="text-[#00ffcc]" />
          </div>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Stop Overthinking. <br/>
          <span className="text-[#00ffcc]">Read Their Mind.</span>
        </h1>
        <p className="text-sm md:text-base text-gray-400 mb-6 px-4">
          47% of people are single because of texting anxiety. Don't let a confusing message ruin your day. Let the Subtext Engine decode what they actually meant.
        </p>
      </div>

      {/* The Subtext Engine Trap */}
      <div className="w-full flex justify-center mb-20">
        <SubtextPaywall />
      </div>

    </div>
  );
}
