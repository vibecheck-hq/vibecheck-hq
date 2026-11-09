import { useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { SUPABASE_URL } from '@/lib/config';

const CHECKOUT_TIMEOUT_MS = 15000;

interface VibeCheckCheckoutButtonProps {
  text: string;
  price: string;
}

type CheckoutStatus = 'idle' | 'loading' | 'error';

export function VibeCheckCheckoutButton({ text, price }: VibeCheckCheckoutButtonProps) {
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const trimmed = text.trim();
  const isDisabled = trimmed.length === 0 || status === 'loading';

  async function handleUnlock() {
    setStatus('loading');
    setErrorMessage('');

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: trimmed, return_origin: window.location.origin }),
        signal: controller.signal,
      });

      const data: unknown = await response.json().catch(() => null);
      const checkoutUrl =
        data && typeof data === 'object' && 'checkout_url' in data && typeof data.checkout_url === 'string'
          ? data.checkout_url
          : null;

      if (!response.ok || !checkoutUrl) {
        const serverError =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : null;
        throw new Error(serverError ?? 'Checkout could not be started. Please try again.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      setErrorMessage(
        isTimeout
          ? 'Checkout took too long. Check your connection and try again.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.'
      );
      setStatus('error');
    } finally {
      window.clearTimeout(timeoutId);
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
        {status === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Lock className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
        )}
        <span>{status === 'loading' ? 'Opening secure checkout...' : `Unlock full decode for ${price}`}</span>
      </button>

      {status === 'error' && (
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
