import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { DecodeReport } from '@/components/DecodeReport';
import { useUnlockPoll } from '@/hooks/useUnlockPoll';

interface DecodeUnlockViewProps {
  sessionUuid: string;
  stripeSessionId: string;
}

export function DecodeUnlockView({ sessionUuid, stripeSessionId }: DecodeUnlockViewProps) {
  const { state, retry } = useUnlockPoll(sessionUuid, stripeSessionId);

  if (state.phase === 'unlocked') {
    return <DecodeReport decode={state.decode} creditsRemaining={state.creditsRemaining} />;
  }

  if (state.phase === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 rounded-3xl border border-[#7F1D1D] bg-[#2A0F12] p-6 text-center animate-in fade-in">
        <AlertCircle className="h-8 w-8 text-[#FCA5A5]" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-[#FECACA]">{state.message}</p>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-2 rounded-xl bg-[#00F5D4] px-5 py-3 text-sm font-semibold text-[#08090C] transition-all duration-200 hover:bg-[#33F7DD] active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center animate-in fade-in">
      <Loader2 className="h-8 w-8 animate-spin text-[#00F5D4]" aria-hidden="true" />
      <p className="text-base font-semibold text-[#F3F4F6]">Confirming your payment</p>
      <p className="text-sm text-[#9CA3AF]">This usually takes a few seconds.</p>
    </div>
  );
}
