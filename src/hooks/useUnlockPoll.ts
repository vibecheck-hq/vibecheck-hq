import { useEffect, useState } from 'react';
import { verifyUnlock, type DecodeResult } from '@/lib/checkoutApi';

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 40;

export type UnlockState =
  | { phase: 'checking' }
  | { phase: 'pending' }
  | { phase: 'unlocked'; decode: DecodeResult; creditsRemaining: number }
  | { phase: 'error'; message: string };

export function useUnlockPoll(sessionUuid: string, stripeSessionId: string) {
  const [state, setState] = useState<UnlockState>({ phase: 'checking' });
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let attempt = 0;
    setState({ phase: 'checking' });

    const poll = async () => {
      attempt += 1;
      try {
        const result = await verifyUnlock(sessionUuid, stripeSessionId);
        if (cancelled) return;

        if (result.state === 'unlocked') {
          setState({ phase: 'unlocked', decode: result.decode, creditsRemaining: result.creditsRemaining });
          return;
        }
        if (attempt >= MAX_ATTEMPTS) {
          setState({ phase: 'error', message: 'Your payment is taking longer than usual to confirm.' });
          return;
        }
        setState({ phase: 'pending' });
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        });
      }
    };

    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [sessionUuid, stripeSessionId, runId]);

  const retry = () => setRunId((id) => id + 1);

  return { state, retry };
}
