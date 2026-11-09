import { useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { startCheckout } from '@/lib/checkoutApi';

interface VibeCheckCheckoutButtonProps {
  text: string;
  price: string;
}

export function VibeCheckCheckoutButton({ text, price }: VibeCheckCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const trimmed = text.trim();
  const isDisabled = trimmed.length === 0 || isLoading;

  async function handleUnlock() {
    setIsLoading(true);
    setErrorMessage('');
    try {
      window.location.href = await startCheckout(trimmed);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleUnlock}
        disabled={isDisabled}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00F5D4] px-6 py-4 text-base font-semibold text-[#08090C] shadow-[0_8px_30px_rgba(0,245,212,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#33F7DD] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#1F2937] disabled:text-[#6B7280] disabled:shadow-none"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Lock className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
        )}
        <span>{isLoading ? 'Opening secure checkout...' : `Unlock 50 decodes for ${price}`}</span>
      </button>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#7F1D1D] bg-[#2A0F12] px-4 py-3 text-sm text-[#FCA5A5] animate-in fade-in"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
