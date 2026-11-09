import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { VibeCheckCheckoutButton } from './components/VibeCheckCheckoutButton';

export default function App() {
  const [text, setText] = useState('');

  return (
    <main className="min-h-screen bg-[#08090C] px-4 py-10 text-[#F3F4F6] flex items-center justify-center">
      <div className="w-full max-w-md flex flex-col gap-6 animate-in fade-in">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00F5D4]/10 ring-1 ring-[#00F5D4]/30">
            <Sparkles className="h-6 w-6 text-[#00F5D4]" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">VibeCheck</h1>
          <p className="text-sm text-[#9CA3AF]">
            Paste a message. Get the true intent, red and green flags, and a reply playbook.
          </p>
        </header>

        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <label htmlFor="message-input" className="text-sm font-medium text-[#D1D5DB]">
            The message you want decoded
          </label>
          <textarea
            id="message-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="e.g. 'Maybe we can catch up sometime, I'm pretty busy this week.'"
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#0E1015] px-4 py-3 text-base text-[#F3F4F6] placeholder:text-[#4B5563] outline-none transition-colors duration-200 focus:border-[#00F5D4]/60 focus:ring-2 focus:ring-[#00F5D4]/20"
          />
          <VibeCheckCheckoutButton text={text} price="£2.99" />
          <p className="text-center text-xs text-[#6B7280]">
            One-time £2.99 payment for 5 decodes. No subscription.
          </p>
        </div>
      </div>
    </main>
  );
}
