import { AlertTriangle, CheckCircle2, Eye, MessageCircle, RotateCcw } from 'lucide-react';
import type { DecodeResult } from '@/lib/checkoutApi';

interface DecodeReportProps {
  decode: DecodeResult;
  creditsRemaining: number;
}

function FlagList({ title, items, tone }: { title: string; items: string[]; tone: 'red' | 'green' }) {
  const Icon = tone === 'red' ? AlertTriangle : CheckCircle2;
  const toneClass = tone === 'red' ? 'text-[#FCA5A5]' : 'text-[#6EE7B7]';

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${toneClass}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </h3>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed text-[#D1D5DB]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'red' ? 'bg-[#F87171]' : 'bg-[#34D399]'}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DecodeReport({ decode, creditsRemaining }: DecodeReportProps) {
  return (
    <article className="flex flex-col gap-4 animate-in fade-in">
      <header className="flex flex-col gap-2 rounded-3xl border border-[#00F5D4]/20 bg-[#00F5D4]/[0.06] p-5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#00F5D4]">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Decode unlocked
        </span>
        <h2 className="text-2xl font-extrabold leading-tight text-[#F3F4F6]">{decode.headline}</h2>
      </header>

      <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-[#FFD166]">True intent</h3>
        <p className="text-sm leading-relaxed text-[#D1D5DB]">{decode.true_intent}</p>
      </section>

      <FlagList title="Red flags" items={decode.red_flags} tone="red" />
      <FlagList title="Green flags" items={decode.green_flags} tone="green" />

      <section className="flex flex-col gap-2 rounded-2xl border border-[#00BBF9]/30 bg-[#00BBF9]/[0.06] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#7DD3FC]">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Your move
        </h3>
        <p className="text-sm leading-relaxed text-[#E5E7EB]">{decode.executive_takeaway}</p>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="text-xs text-[#9CA3AF]">
          {creditsRemaining} {creditsRemaining === 1 ? 'decode' : 'decodes'} left on your pass
        </span>
        <a
          href="/"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#F3F4F6] transition-colors duration-200 hover:border-[#00F5D4]/50 hover:text-[#00F5D4] active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Decode another
        </a>
      </div>
    </article>
  );
}
